import * as parser from '@babel/parser';
import * as recast from 'recast';
import type { ParserOptions } from '@babel/parser';

export const parserOptions: ParserOptions = {
  sourceType: 'module',
  // FIXME: we should get this from the project config somehow?
  plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
  tokens: true,
};

export const babelParse = (code: string) => {
  return recast.parse(code, {
    parser: {
      parse(source: string) {
        return parser.parse(source, parserOptions);
      },
    },
  });
};

export const babelParseExpression = (code: string) => {
  return parser.parseExpression(code, parserOptions);
};
