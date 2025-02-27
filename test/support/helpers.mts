/* eslint-disable max-classes-per-file */
import { Options } from 'yeoman-environment';
import type YeomanGenerator from 'yeoman-generator';
import { YeomanTest, RunContext, RunContextSettings } from 'yeoman-test';
import { GeneratorConstructor } from 'yeoman-test/dist/helpers.js';

import EnvironmentBuilder from '../../cli/environment-builder.mjs';
import { BaseEntity } from '../../generators/base-application/index.mjs';
import { JHIPSTER_CONFIG_DIR } from '../../generators/generator-constants.mjs';
import { GENERATOR_WORKSPACES } from '../../generators/generator-list.mjs';
import getGenerator from './get-generator.mjs';
import { deploymentTestSamples } from './mock-config.mjs';
import { normalizePathEnd } from '../../generators/base/support/index.mjs';

const DEFAULT_TEST_SETTINGS = { forwardCwd: true };
const DEFAULT_TEST_OPTIONS = { skipInstall: true };
const DEFAULT_TEST_ENV_OPTIONS = { skipInstall: true, dryRun: false };

const createFiles = (workspaceFolder: string, configuration: Record<string, unknown>, entities?: BaseEntity[]) => {
  if (!configuration.baseName) {
    throw new Error('baseName is required');
  }
  workspaceFolder = workspaceFolder ? normalizePathEnd(workspaceFolder) : workspaceFolder;
  const entityFiles = entities
    ? Object.fromEntries(entities?.map(entity => [`${workspaceFolder}${JHIPSTER_CONFIG_DIR}/${entity.name}.json`, entity]))
    : {};
  configuration = { entities: entities?.map(e => e.name), ...configuration };
  return {
    [`${workspaceFolder}.yo-rc.json`]: { 'generator-jhipster': configuration },
    ...entityFiles,
  };
};

class JHipsterRunContext<GeneratorType extends YeomanGenerator> extends RunContext<GeneratorType> {
  private workspaceApplications: string[] = [];
  private commonWorkspacesConfig: Record<string, unknown>;
  private generateApplicationsSet = false;

  withJHipsterConfig(configuration?: Record<string, unknown>, entities?: BaseEntity[]): this {
    return this.withFiles(createFiles('', { baseName: 'jhipster', ...configuration }, entities));
  }

  withSkipWritingPriorities(): this {
    return this.withOptions({ skipPriorities: ['writing', 'postWriting', 'writingEntities', 'postWritingEntities'] });
  }

  withWorkspacesCommonConfig(commonWorkspacesConfig: Record<string, unknown>): this {
    if (this.workspaceApplications.length > 0) {
      throw new Error('Cannot be called after withWorkspaceApplication');
    }
    this.commonWorkspacesConfig = { ...this.commonWorkspacesConfig, ...commonWorkspacesConfig };
    return this;
  }

  withWorkspaceApplicationAtFolder(workspaceFolder: string, configuration: Record<string, unknown>, entities?: BaseEntity[]): this {
    if (this.generateApplicationsSet) {
      throw new Error('Cannot be called after withWorkspaceApplication');
    }
    this.workspaceApplications.push(workspaceFolder);
    return this.withFiles(createFiles(workspaceFolder, { ...configuration, ...this.commonWorkspacesConfig }, entities));
  }

  withWorkspaceApplication(configuration: Record<string, unknown>, entities?: BaseEntity[]): this {
    return this.withWorkspaceApplicationAtFolder(configuration.baseName as string, configuration, entities);
  }

  withWorkspacesSamples(...appNames: string[]): this {
    for (const appName of appNames) {
      const application = deploymentTestSamples[appName];
      if (!application) {
        throw new Error(`Application ${appName} not found`);
      }
      this.withWorkspaceApplicationAtFolder(appName, deploymentTestSamples[appName]);
    }
    return this;
  }

  withGenerateWorkspaceApplications(): this {
    this.generateApplicationsSet = true;
    return this.withOptions({ generateApplications: this.workspaceApplications });
  }
}

class JHipsterTest extends YeomanTest {
  run<GeneratorType extends YeomanGenerator<YeomanGenerator.GeneratorOptions> = YeomanGenerator<YeomanGenerator.GeneratorOptions>>(
    GeneratorOrNamespace: string | GeneratorConstructor<GeneratorType>,
    settings?: RunContextSettings | undefined,
    envOptions?: Options | undefined
  ): JHipsterRunContext<GeneratorType> {
    return super.run(GeneratorOrNamespace, settings, envOptions) as any;
  }

  runJHipster<GeneratorType extends YeomanGenerator<YeomanGenerator.GeneratorOptions> = YeomanGenerator<YeomanGenerator.GeneratorOptions>>(
    jhipsterGenerator: string,
    settings?: RunContextSettings | undefined,
    envOptions?: Options | undefined
  ): JHipsterRunContext<GeneratorType> {
    return this.run(getGenerator(jhipsterGenerator), settings, envOptions);
  }

  create<GeneratorType extends YeomanGenerator<YeomanGenerator.GeneratorOptions> = YeomanGenerator<YeomanGenerator.GeneratorOptions>>(
    GeneratorOrNamespace: string | GeneratorConstructor<GeneratorType>,
    settings?: RunContextSettings | undefined,
    envOptions?: Options | undefined
  ): JHipsterRunContext<GeneratorType> {
    return super.create(GeneratorOrNamespace, settings, envOptions) as any;
  }

  createJHipster<
    GeneratorType extends YeomanGenerator<YeomanGenerator.GeneratorOptions> = YeomanGenerator<YeomanGenerator.GeneratorOptions>
  >(
    jhipsterGenerator: string,
    settings?: RunContextSettings | undefined,
    envOptions?: Options | undefined
  ): JHipsterRunContext<GeneratorType> {
    return this.create(getGenerator(jhipsterGenerator), settings, envOptions);
  }

  generateDeploymentWorkspaces(commonConfig?: Record<string, unknown>) {
    return this.runJHipster(GENERATOR_WORKSPACES)
      .withWorkspacesCommonConfig(commonConfig ?? {})
      .withOptions({
        generateWorkspaces: true,
        generateWith: 'docker',
        skipPriorities: ['prompting'],
      });
  }
}

export function createTestHelpers(options: any = {}) {
  const { environmentOptions = {} } = options;
  const sharedOptions = {
    ...DEFAULT_TEST_OPTIONS,
    ...environmentOptions.sharedOptions,
  };
  const helper = new JHipsterTest();
  helper.settings = { ...DEFAULT_TEST_SETTINGS, ...options.settings };
  helper.environmentOptions = { ...DEFAULT_TEST_ENV_OPTIONS, ...environmentOptions, sharedOptions };
  helper.generatorOptions = { ...DEFAULT_TEST_OPTIONS, ...options.generatorOptions };
  helper.createEnv = (...args) => EnvironmentBuilder.createEnv(...args) as any;
  helper.getRunContextType = () => JHipsterRunContext;
  return helper;
}

const commonTestOptions = { reproducible: true, skipChecks: true, reproducibleTests: true, noInsight: true };

export const basicHelpers = createTestHelpers({ generatorOptions: { ...commonTestOptions } });

export const defaultHelpers = createTestHelpers({
  generatorOptions: { skipPrettier: true, ...commonTestOptions },
  environmentOptions: { dryRun: true },
});

export const skipPrettierHelpers = createTestHelpers({ generatorOptions: { skipPrettier: true, ...commonTestOptions } });

export const dryRunHelpers = createTestHelpers({
  generatorOptions: { skipPrettier: true, ...commonTestOptions },
  environmentOptions: { dryRun: true },
});
