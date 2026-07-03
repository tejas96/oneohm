import { readFileSync } from 'fs';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Handlebars from 'handlebars';

import {
  autoDashFieldPlaceholders,
  registerReportHandlebarsHelpers,
} from './report-handlebars.helpers';
import { resolveReportAsset } from '../utils/report.utils';

function readTextFileOrThrow(fullPath: string, notFoundMessage: string): string {
  try {
    return readFileSync(fullPath, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(notFoundMessage);
    }
    throw error;
  }
}

function readTextFileOrEmpty(fullPath: string): string {
  try {
    return readFileSync(fullPath, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

@Injectable()
export class TemplateRendererService implements OnModuleInit {
  private readonly logger = new Logger(TemplateRendererService.name);
  private readonly compiled = new Map<
    string,
    { template: HandlebarsTemplateDelegate; source: string }
  >();
  private baseCss = '';

  onModuleInit(): void {
    const cssPath = resolveReportAsset('renderer', 'assets', 'base-report.css');
    this.baseCss = readTextFileOrEmpty(cssPath);
    registerReportHandlebarsHelpers();
  }

  render(templateFile: string, viewModel: Record<string, string>): string {
    const template = this.getCompiled(templateFile);
    const body = template(viewModel);
    if (body.includes('<!doctype') || body.includes('<html')) {
      return this.injectPrintBaseCss(body);
    }
    return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><style>${this.baseCss}</style></head><body>${body}</body></html>`;
  }

  private injectPrintBaseCss(html: string): string {
    const printCssPath = resolveReportAsset('renderer', 'assets', 'report-print-base.css');
    const printCss = readTextFileOrEmpty(printCssPath);
    if (!printCss) {
      return html;
    }
    const tag = `<style data-report-print-base>${printCss}</style>`;
    if (html.includes('</head>')) {
      return html.replace('</head>', `${tag}</head>`);
    }
    return html;
  }

  private getCompiled(templateFile: string): HandlebarsTemplateDelegate {
    const fullPath = resolveReportAsset(templateFile);
    const source = readTextFileOrThrow(fullPath, `Report template not found: ${fullPath}`);

    const cached = this.compiled.get(templateFile);
    if (cached?.source === source) {
      return cached.template;
    }

    const processed = autoDashFieldPlaceholders(source);
    const compiled = Handlebars.compile(processed, { noEscape: false });
    this.compiled.set(templateFile, { template: compiled, source });
    this.logger.log(`Compiled report template: ${templateFile}`);
    return compiled;
  }
}
