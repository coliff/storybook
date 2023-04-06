/* eslint-disable no-underscore-dangle */
import fs from 'fs-extra';
import { dedent } from 'ts-dedent';

import * as t from '@babel/types';

import * as generate from '@babel/generator';

import * as traverse from '@babel/traverse';
import { toId, isExportStory, storyNameFromExport } from '@storybook/csf';
import type { Tag, StoryAnnotations, ComponentAnnotations } from '@storybook/types';
import { babelParse } from './babelParse';
import { findVarInitialization } from './findVarInitialization';

const logger = console;

function parseIncludeExclude(prop: t.Node) {
  if (t.isArrayExpression(prop)) {
    return prop.elements.map((e) => {
      if (t.isStringLiteral(e)) return e.value;
      throw new Error(`Expected string literal: ${e}`);
    });
  }

  if (t.isStringLiteral(prop)) return new RegExp(prop.value);

  if (t.isRegExpLiteral(prop)) return new RegExp(prop.pattern, prop.flags);

  throw new Error(`Unknown include/exclude: ${prop}`);
}

function parseTags(prop: t.Node) {
  if (!t.isArrayExpression(prop)) {
    throw new Error('CSF: Expected tags array');
  }

  return prop.elements.map((e) => {
    if (t.isStringLiteral(e)) return e.value;
    throw new Error(`CSF: Expected tag to be string literal`);
  }) as Tag[];
}

const formatLocation = (node: t.Node, fileName?: string) => {
  const { line, column } = node.loc?.start || {};
  return `${fileName || ''} (line ${line}, col ${column})`.trim();
};

const isArgsStory = (init: t.Node, parent: t.Node, csf: CsfFile) => {
  let storyFn: t.Node = init;
  // export const Foo = Bar.bind({})
  if (t.isCallExpression(init)) {
    const { callee, arguments: bindArguments } = init;
    if (
      t.isProgram(parent) &&
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.object) &&
      t.isIdentifier(callee.property) &&
      callee.property.name === 'bind' &&
      (bindArguments.length === 0 ||
        (bindArguments.length === 1 &&
          t.isObjectExpression(bindArguments[0]) &&
          bindArguments[0].properties.length === 0))
    ) {
      const boundIdentifier = callee.object.name;
      const template = findVarInitialization(boundIdentifier, parent);
      if (template) {
        // eslint-disable-next-line no-param-reassign
        csf._templates[boundIdentifier] = template;
        storyFn = template;
      }
    }
  }
  if (t.isArrowFunctionExpression(storyFn)) {
    return storyFn.params.length > 0;
  }
  if (t.isFunctionDeclaration(storyFn)) {
    return storyFn.params.length > 0;
  }
  return false;
};

const parseExportsOrder = (init: t.Expression) => {
  if (t.isArrayExpression(init)) {
    return (init.elements as t.Expression[]).map((item) => {
      if (t.isStringLiteral(item)) {
        return item.value;
      }
      throw new Error(`Expected string literal named export: ${item}`);
    });
  }
  throw new Error(`Expected array of string literals: ${init}`);
};

const sortExports = (exportByName: Record<string, any>, order: string[]) => {
  return order.reduce((acc, name) => {
    const namedExport = exportByName[name];
    if (namedExport) acc[name] = namedExport;
    return acc;
  }, {} as Record<string, any>);
};

export interface CsfOptions {
  fileName?: string;
  makeTitle: (userTitle: string) => string;
}

export class NoMetaError extends Error {
  constructor(ast: t.Node, fileName?: string) {
    super(dedent`
      CSF: missing default export ${formatLocation(ast, fileName)}

      More info: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
    `);
    this.name = this.constructor.name;
  }
}

export interface StaticMeta
  extends Pick<
    ComponentAnnotations,
    'id' | 'title' | 'includeStories' | 'excludeStories' | 'tags'
  > {
  component?: string;
}

export interface StaticStory extends Pick<StoryAnnotations, 'name' | 'parameters' | 'tags'> {
  id: string;
}

export class CsfFile {
  _ast: t.File;

  _fileName: string;

  _makeTitle: (title: string) => string;

  _meta?: StaticMeta;

  _stories: Record<string, StaticStory> = {};

  _metaAnnotations: Record<string, t.Node> = {};

  _storyExports: Record<string, t.VariableDeclarator | t.FunctionDeclaration> = {};

  _metaStatement: t.Statement | undefined;

  _metaNode: t.Expression | undefined;

  _storyStatements: Record<string, t.ExportNamedDeclaration> = {};

  _storyAnnotations: Record<string, Record<string, t.Node>> = {};

  _templates: Record<string, t.Expression> = {};

  _namedExportsOrder?: string[];

  imports: string[];

  constructor(ast: t.File, { fileName, makeTitle }: CsfOptions) {
    this._ast = ast;
    this._fileName = fileName as string;
    this.imports = [];
    this._makeTitle = makeTitle;
  }

  _parseTitle(value: t.Node) {
    const node = t.isIdentifier(value)
      ? findVarInitialization(value.name, this._ast.program)
      : value;
    if (t.isStringLiteral(node)) return node.value;
    throw new Error(dedent`
      CSF: unexpected dynamic title ${formatLocation(node, this._fileName)}

      More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#string-literal-titles
    `);
  }

  _parseMeta(declaration: t.ObjectExpression, program: t.Program) {
    const meta: StaticMeta = {};
    (declaration.properties as t.ObjectProperty[]).forEach((p) => {
      if (t.isIdentifier(p.key)) {
        this._metaAnnotations[p.key.name] = p.value;

        if (p.key.name === 'title') {
          meta.title = this._parseTitle(p.value);
        } else if (['includeStories', 'excludeStories'].includes(p.key.name)) {
          (meta as any)[p.key.name] = parseIncludeExclude(p.value);
        } else if (p.key.name === 'component') {
          const { code } = generate.default(p.value, {});
          meta.component = code;
        } else if (p.key.name === 'tags') {
          let node = p.value;
          if (t.isIdentifier(node)) {
            node = findVarInitialization(node.name, this._ast.program);
          }
          meta.tags = parseTags(node);
        } else if (p.key.name === 'id') {
          if (t.isStringLiteral(p.value)) {
            meta.id = p.value.value;
          } else {
            throw new Error(`Unexpected component id: ${p.value}`);
          }
        }
      }
    });
    this._meta = meta;
  }

  getStoryExport(key: string) {
    let node = this._storyExports[key] as t.Node;
    node = t.isVariableDeclarator(node) ? (node.init as t.Node) : node;
    if (t.isCallExpression(node)) {
      const { callee, arguments: bindArguments } = node;
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object) &&
        t.isIdentifier(callee.property) &&
        callee.property.name === 'bind' &&
        (bindArguments.length === 0 ||
          (bindArguments.length === 1 &&
            t.isObjectExpression(bindArguments[0]) &&
            bindArguments[0].properties.length === 0))
      ) {
        const { name } = callee.object;
        node = this._templates[name];
      }
    }
    return node;
  }

  parse() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    traverse.default(this._ast, {
      ExportDefaultDeclaration: {
        enter({ node, parent }) {
          let metaNode: t.ObjectExpression | undefined;
          const isVariableReference = t.isIdentifier(node.declaration) && t.isProgram(parent);
          let decl;
          if (isVariableReference) {
            // const meta = { ... };
            // export default meta;
            const variableName = (node.declaration as t.Identifier).name;
            const isVariableDeclarator = (declaration: t.VariableDeclarator) =>
              t.isIdentifier(declaration.id) && declaration.id.name === variableName;

            self._metaStatement = self._ast.program.body.find(
              (topLevelNode) =>
                t.isVariableDeclaration(topLevelNode) &&
                topLevelNode.declarations.find(isVariableDeclarator)
            );
            decl = ((self?._metaStatement as t.VariableDeclaration)?.declarations || []).find(
              isVariableDeclarator
            )?.init;
          } else {
            self._metaStatement = node;
            decl = node.declaration;
          }

          if (t.isObjectExpression(decl)) {
            // export default { ... };
            metaNode = decl;
          } else if (
            // export default { ... } as Meta<...>
            (t.isTSAsExpression(decl) || t.isTSSatisfiesExpression(decl)) &&
            t.isObjectExpression(decl.expression)
          ) {
            metaNode = decl.expression;
          }

          if (!self._meta && metaNode && t.isProgram(parent)) {
            self._metaNode = metaNode;
            self._parseMeta(metaNode, parent);
          }
        },
      },
      ExportNamedDeclaration: {
        enter({ node, parent }) {
          let declarations;
          if (t.isVariableDeclaration(node.declaration)) {
            declarations = node.declaration.declarations.filter((d) => t.isVariableDeclarator(d));
          } else if (t.isFunctionDeclaration(node.declaration)) {
            declarations = [node.declaration];
          }
          if (declarations) {
            // export const X = ...;
            declarations.forEach((decl: t.VariableDeclarator | t.FunctionDeclaration) => {
              if (t.isIdentifier(decl.id)) {
                const { name: exportName } = decl.id;
                if (exportName === '__namedExportsOrder' && t.isVariableDeclarator(decl)) {
                  self._namedExportsOrder = parseExportsOrder(decl.init as t.Expression);
                  return;
                }
                self._storyExports[exportName] = decl;
                self._storyStatements[exportName] = node;
                let name = storyNameFromExport(exportName);
                if (self._storyAnnotations[exportName]) {
                  logger.warn(
                    `Unexpected annotations for "${exportName}" before story declaration`
                  );
                } else {
                  self._storyAnnotations[exportName] = {};
                }
                let parameters;
                if (t.isVariableDeclarator(decl) && t.isObjectExpression(decl.init)) {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  let __isArgsStory = true; // assume default render is an args story
                  // CSF3 object export
                  (decl.init.properties as t.ObjectProperty[]).forEach((p) => {
                    if (t.isIdentifier(p.key)) {
                      if (p.key.name === 'render') {
                        __isArgsStory = isArgsStory(p.value as t.Expression, parent, self);
                      } else if (p.key.name === 'name' && t.isStringLiteral(p.value)) {
                        name = p.value.value;
                      } else if (p.key.name === 'storyName' && t.isStringLiteral(p.value)) {
                        logger.warn(
                          `Unexpected usage of "storyName" in "${exportName}". Please use "name" instead.`
                        );
                      }
                      self._storyAnnotations[exportName][p.key.name] = p.value;
                    }
                  });
                  parameters = { __isArgsStory };
                } else {
                  const fn = t.isVariableDeclarator(decl) ? decl.init : decl;
                  parameters = {
                    // __id: toId(self._meta.title, name),
                    // FIXME: Template.bind({});
                    __isArgsStory: isArgsStory(fn as t.Node, parent, self),
                  };
                }
                self._stories[exportName] = {
                  id: 'FIXME',
                  name,
                  parameters,
                };
              }
            });
          } else if (node.specifiers.length > 0) {
            // export { X as Y }
            node.specifiers.forEach((specifier) => {
              if (t.isExportSpecifier(specifier) && t.isIdentifier(specifier.exported)) {
                const { name: exportName } = specifier.exported;
                if (exportName === 'default') {
                  let metaNode: t.ObjectExpression | undefined;
                  const decl = t.isProgram(parent)
                    ? findVarInitialization(specifier.local.name, parent)
                    : specifier.local;

                  if (t.isObjectExpression(decl)) {
                    // export default { ... };
                    metaNode = decl;
                  } else if (
                    // export default { ... } as Meta<...>
                    t.isTSAsExpression(decl) &&
                    t.isObjectExpression(decl.expression)
                  ) {
                    metaNode = decl.expression;
                  }

                  if (!self._meta && metaNode && t.isProgram(parent)) {
                    self._parseMeta(metaNode, parent);
                  }
                } else {
                  self._storyAnnotations[exportName] = {};
                  self._stories[exportName] = { id: 'FIXME', name: exportName, parameters: {} };
                }
              }
            });
          }
        },
      },
      ExpressionStatement: {
        enter({ node, parent }) {
          const { expression } = node;
          // B.storyName = 'some string';
          if (
            t.isProgram(parent) &&
            t.isAssignmentExpression(expression) &&
            t.isMemberExpression(expression.left) &&
            t.isIdentifier(expression.left.object) &&
            t.isIdentifier(expression.left.property)
          ) {
            const exportName = expression.left.object.name;
            const annotationKey = expression.left.property.name;
            const annotationValue = expression.right;

            // v1-style annotation
            // A.story = { parameters: ..., decorators: ... }

            if (self._storyAnnotations[exportName]) {
              if (annotationKey === 'story' && t.isObjectExpression(annotationValue)) {
                (annotationValue.properties as t.ObjectProperty[]).forEach((prop) => {
                  if (t.isIdentifier(prop.key)) {
                    self._storyAnnotations[exportName][prop.key.name] = prop.value;
                  }
                });
              } else {
                self._storyAnnotations[exportName][annotationKey] = annotationValue;
              }
            }

            if (annotationKey === 'storyName' && t.isStringLiteral(annotationValue)) {
              const storyName = annotationValue.value;
              const story = self._stories[exportName];
              if (!story) return;
              story.name = storyName;
            }
          }
        },
      },
      CallExpression: {
        enter({ node }) {
          const { callee } = node;
          if (t.isIdentifier(callee) && callee.name === 'storiesOf') {
            throw new Error(dedent`
              Unexpected \`storiesOf\` usage: ${formatLocation(node, self._fileName)}.

              In SB7, we use the next-generation \`storyStoreV7\` by default, which does not support \`storiesOf\`. 
              More info, with details about how to opt-out here: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#storystorev7-enabled-by-default
            `);
          }
        },
      },
      ImportDeclaration: {
        enter({ node }) {
          const { source } = node;
          if (t.isStringLiteral(source)) {
            self.imports.push(source.value);
          } else {
            throw new Error('CSF: unexpected import source');
          }
        },
      },
    });

    if (!self._meta) {
      throw new NoMetaError(self._ast, self._fileName);
    }

    if (!self._meta.title && !self._meta.component) {
      throw new Error(dedent`
        CSF: missing title/component ${formatLocation(self._ast, self._fileName)}

        More info: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
      `);
    }

    // default export can come at any point in the file, so we do this post processing last
    const entries = Object.entries(self._stories);
    self._meta.title = this._makeTitle(self._meta?.title as string);
    if (self._metaAnnotations.play) {
      self._meta.tags = [...(self._meta.tags || []), 'play-fn'];
    }
    self._stories = entries.reduce((acc, [key, story]) => {
      if (isExportStory(key, self._meta as StaticMeta)) {
        const id = toId((self._meta?.id || self._meta?.title) as string, storyNameFromExport(key));
        const parameters: Record<string, any> = { ...story.parameters, __id: id };
        const { includeStories } = self._meta || {};
        if (
          key === '__page' &&
          (entries.length === 1 || (Array.isArray(includeStories) && includeStories.length === 1))
        ) {
          parameters.docsOnly = true;
        }
        acc[key] = { ...story, id, parameters };
        const { tags, play } = self._storyAnnotations[key];
        if (tags) {
          const node = t.isIdentifier(tags)
            ? findVarInitialization(tags.name, this._ast.program)
            : tags;
          acc[key].tags = parseTags(node);
        }
        if (play) {
          acc[key].tags = [...(acc[key].tags || []), 'play-fn'];
        }
      }
      return acc;
    }, {} as Record<string, StaticStory>);

    Object.keys(self._storyExports).forEach((key) => {
      if (!isExportStory(key, self._meta as StaticMeta)) {
        delete self._storyExports[key];
        delete self._storyAnnotations[key];
      }
    });

    if (self._namedExportsOrder) {
      const unsortedExports = Object.keys(self._storyExports);
      self._storyExports = sortExports(self._storyExports, self._namedExportsOrder);
      self._stories = sortExports(self._stories, self._namedExportsOrder);

      const sortedExports = Object.keys(self._storyExports);
      if (unsortedExports.length !== sortedExports.length) {
        throw new Error(
          `Missing exports after sort: ${unsortedExports.filter(
            (key) => !sortedExports.includes(key)
          )}`
        );
      }
    }

    return self;
  }

  public get meta() {
    return this._meta;
  }

  public get stories() {
    return Object.values(this._stories);
  }
}

export const loadCsf = (code: string, options: CsfOptions) => {
  const ast = babelParse(code);
  return new CsfFile(ast, options);
};

interface FormatOptions {
  sourceMaps?: boolean;
}
export const formatCsf = (csf: CsfFile, options: FormatOptions = { sourceMaps: false }) => {
  const result = generate.default(csf._ast, options);
  if (options.sourceMaps) {
    return result;
  }
  const { code } = result;
  return code;
};

export const readCsf = async (fileName: string, options: CsfOptions) => {
  const code = (await fs.readFile(fileName, 'utf-8')).toString();
  return loadCsf(code, { ...options, fileName });
};

export const writeCsf = async (csf: CsfFile, fileName?: string) => {
  const fname = fileName || csf._fileName;
  if (!fname) throw new Error('Please specify a fileName for writeCsf');
  await fs.writeFile(fileName as string, (await formatCsf(csf)) as string);
};
