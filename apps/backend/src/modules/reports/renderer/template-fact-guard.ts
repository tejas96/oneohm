import { readFileSync } from 'fs';

import { REPORT_DEFINITIONS } from '@tejas96/shared/reports';
import Handlebars from 'handlebars';

import { resolveReportAsset, templateFileFor } from '../utils/report.utils';

/** Printed as blank lines until these facts exist. */
const KNOWN_UNDECLARED = new Set([
  'installation_date',
  're_installed_capacity_ground_kw',
  're_installed_capacity_rooftop_ground_kw',
]);

type Call = Pick<hbs.AST.MustacheStatement, 'path' | 'params' | 'hash'>;

function templateVariables(source: string): Set<string> {
  const names = new Set<string>();
  const addExpression = (expression: hbs.AST.Expression): void => {
    if (expression.type === 'PathExpression') {
      names.add((expression as hbs.AST.PathExpression).original);
    } else if (expression.type === 'SubExpression') {
      addCall(expression as hbs.AST.SubExpression);
    }
  };
  const addHash = (hash: hbs.AST.Hash | undefined): void =>
    hash?.pairs.forEach((pair) => addExpression(pair.value));
  // With no arguments the path is the value; with arguments it names a helper.
  const addCall = (call: Call): void => {
    if (call.params.length === 0 && !call.hash) addExpression(call.path);
    call.params.forEach(addExpression);
    addHash(call.hash);
  };
  const visit = (statements: hbs.AST.Statement[]): void => {
    for (const statement of statements) {
      if (statement.type === 'MustacheStatement') {
        addCall(statement as hbs.AST.MustacheStatement);
      } else if (statement.type === 'BlockStatement') {
        const block = statement as hbs.AST.BlockStatement;
        addCall(block);
        visit(block.program?.body ?? []);
        visit(block.inverse?.body ?? []);
      } else if (statement.type === 'PartialStatement') {
        const partial = statement as hbs.AST.PartialStatement;
        partial.params.forEach(addExpression);
        addHash(partial.hash);
      }
    }
  };
  visit(Handlebars.parse(source).body);
  return names;
}

/** Every variable a report template prints must be a fact its definition declares. */
export function findUndeclaredTemplateFacts(): string[] {
  const problems: string[] = [];
  for (const definition of REPORT_DEFINITIONS) {
    const declared = new Set<string>(definition.facts.map(({ key }) => key));
    const source = readFileSync(resolveReportAsset(templateFileFor(definition)), 'utf8');
    for (const name of templateVariables(source)) {
      if (!declared.has(name) && !KNOWN_UNDECLARED.has(name)) {
        problems.push(
          `${templateFileFor(definition)} prints "${name}", which ${definition.id} does not declare`,
        );
      }
    }
  }
  return problems;
}
