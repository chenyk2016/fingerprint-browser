import fs from 'fs/promises';
import path from 'path';
import { BrowserConfig } from '../types/browser';
import { config } from '../config';

export class ConfigService {
  private configFile: string;
  private dataDir: string;
  private profilesDir: string;

  constructor() {
    this.configFile = config.configFile;
    this.dataDir = config.dataDir;
    this.profilesDir = config.profilesDir;
  }

  // 确保配置目录存在
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  // 确保配置文件存在
  private async ensureConfigFile(): Promise<void> {
    try {
      await fs.access(this.configFile);
    } catch {
      await this.saveConfigs({});
    }
  }

  // 确保用户数据目录存在
  async ensureProfileDir(configName: string): Promise<string> {
    const profileDir = path.join(this.profilesDir, configName);
    try {
      await fs.access(profileDir);
    } catch {
      await fs.mkdir(profileDir, { recursive: true });
    }
    return profileDir;
  }

  // 清理用户数据目录
  async cleanupProfileDir(configName: string): Promise<void> {
    const profileDir = path.join(this.profilesDir, configName);
    try {
      await fs.rm(profileDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Error cleaning up profile directory for ${configName}:`, error);
    }
  }

  // 加载所有配置
  async loadConfigs(): Promise<Record<string, BrowserConfig>> {
    try {
      await this.ensureConfigDir();
      await this.ensureConfigFile();
      const data = await fs.readFile(this.configFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading configs:', error);
      return {};
    }
  }

  // 保存配置
  async saveConfigs(configs: Record<string, BrowserConfig>): Promise<void> {
    try {
      await this.ensureConfigDir();
      await fs.writeFile(this.configFile, JSON.stringify(configs, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving configs:', error);
      throw error;
    }
  }

  // 获取单个配置
  async getConfig(configName: string): Promise<BrowserConfig | null> {
    const configs = await this.loadConfigs();
    return configs[configName] || null;
  }

  // 更新单个配置
  async updateConfig(configName: string, config: BrowserConfig): Promise<void> {
    const configs = await this.loadConfigs();
    configs[configName] = config;
    await this.saveConfigs(configs);
  }

  // 删除配置
  async deleteConfig(configName: string): Promise<void> {
    const configs = await this.loadConfigs();
    delete configs[configName];
    await this.saveConfigs(configs);
    await this.cleanupProfileDir(configName);
  }
} 