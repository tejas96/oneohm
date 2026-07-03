import { readFileSync, existsSync, statSync } from 'fs';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Handlebars from 'handlebars';

import {
  autoDashFieldPlaceholders,
  registerReportHandlebarsHelpers,
} from './report-handlebars.helpers';
import { resolveReportAsset } from '../utils/report.utils';

@Injectable()
export class TemplateRendererService implements OnModuleInit {
  private readonly logger = new Logger(TemplateRendererService.name);
  private readonly compiled = new Map<
    string,
    { template: HandlebarsTemplateDelegate; mtimeMs: number }
  >();
  private baseCss = '';

  onModuleInit(): void {
    const cssPath = resolveReportAsset('renderer', 'assets', 'base-report.css');
    if (existsSync(cssPath)) {
      this.baseCss = readFileSync(cssPath, 'utf8');
    }
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
    if (!existsSync(printCssPath)) {
      return html;
    }
    const printCss = readFileSync(printCssPath, 'utf8');
    const tag = `<style data-report-print-base>${printCss}</style>`;
    if (html.includes('</head>')) {
      return html.replace('</head>', `${tag}</head>`);
    }
    return html;
  }

  private getCompiled(templateFile: string): HandlebarsTemplateDelegate {
    const fullPath = resolveReportAsset(templateFile);
    if (!existsSync(fullPath)) {
      throw new Error(`Report template not found: ${fullPath}`);
    }

    const mtimeMs = statSync(fullPath).mtimeMs;
    const cached = this.compiled.get(templateFile);
    if (cached?.mtimeMs === mtimeMs) {
      return cached.template;
    }

    const source = autoDashFieldPlaceholders(readFileSync(fullPath, 'utf8'));
    const compiled = Handlebars.compile(source, { noEscape: false });
    this.compiled.set(templateFile, { template: compiled, mtimeMs });
    this.logger.log(`Compiled report template: ${templateFile}`);
    return compiled;
  }
}
