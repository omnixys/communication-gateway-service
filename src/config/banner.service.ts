import { env } from './env.js';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import {
  displayLogEnvValue,
  getLogger,
  getLogEnvSection,
  LOG_ENV_SECTION_ORDER,
  type LogEnvSection,
} from '@omnixys/logger-ts';
import cFonts from 'cfonts';
import chalk from 'chalk';
import { release, type } from 'node:os';
import process from 'node:process';

/** Prints gateway startup details using the same lifecycle as the user service. */
@Injectable()
export class BannerService implements OnApplicationBootstrap {
  readonly #logger = getLogger(BannerService.name, 'class');

  onApplicationBootstrap(): void {
    cFonts.say(env.SERVICE, {
      font: 'block',
      align: 'left',
      gradient: ['white', 'black'],
      background: 'transparent',
      letterSpacing: 1,
      lineHeight: 1,
    });

    this.#logger.info(chalk.green('=== Anwendungsinformationen ==='));
    this.#logger.info(chalk.cyan('Anwendungsname: ') + chalk.yellow(env.SERVICE));
    this.#logger.info(chalk.cyan('Node.js-Version: ') + chalk.yellow(process.version));
    this.#logger.info(chalk.cyan('Umgebung: ') + chalk.yellow(env.NODE_ENV));
    this.#logger.info(chalk.cyan('Host: ') + chalk.yellow(env.HOST));
    this.#logger.info(chalk.cyan('Port: ') + chalk.yellow(String(env.PORT)));
    this.#logger.info(chalk.cyan('Betriebssystem: ') + chalk.yellow(`${type()} (${release()})`));

    const groups = new Map<LogEnvSection, Array<[string, string]>>();
    for (const section of LOG_ENV_SECTION_ORDER) {
      groups.set(section, []);
    }
    for (const [key, value] of Object.entries(env)) {
      if (['SERVICE', 'NODE_ENV', 'HOST', 'PORT'].includes(key) || typeof value === 'object') {
        continue;
      }
      groups
        .get(getLogEnvSection(key))
        ?.push([key, displayLogEnvValue(key, value, { nodeEnv: 'production' })]);
    }
    for (const section of LOG_ENV_SECTION_ORDER) {
      const entries = groups.get(section);
      if (entries === undefined || entries.length === 0) {
        continue;
      }
      this.#logger.info(chalk.green(`==============${section}===========`));
      for (const [key, value] of entries) {
        this.#logger.info(chalk.cyan(`${key}: `) + chalk.yellow(value));
      }
    }
    this.#logger.info(chalk.green('==============================='));
  }
}
