import { BrowserManager } from '../browsers/browser-manager';
import { EventEmitter } from 'events';

export type BrowserStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export class BrowserStateService extends EventEmitter {
  private browserStatuses: Record<string, BrowserStatus> = {};
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private browserManager: BrowserManager) {
    super();
    this.setupEventListeners();
    this.startStatusCheck();
  }

  private setupEventListeners() {
    this.browserManager.on('browserClosed', (configName: string) => {
      console.log(`Browser closed event received: ${configName}`);
      this.updateStatus(configName, 'stopped');
    });

    this.browserManager.on('browserError', (configName: string, error: Error) => {
      console.error(`Browser error event received: ${configName}`, error);
      this.updateStatus(configName, 'error');
    });
  }

  private startStatusCheck() {
    this.checkInterval = setInterval(() => {
      Object.keys(this.browserStatuses).forEach(configName => {
        const isRunning = this.browserManager.isBrowserRunning(configName);
        const currentStatus = this.browserStatuses[configName];
        
        if (isRunning && currentStatus !== 'running') {
          this.updateStatus(configName, 'running');
        } else if (!isRunning && currentStatus === 'running') {
          this.updateStatus(configName, 'stopped');
        }
      });
    }, 5000);
  }

  public updateStatus(configName: string, status: BrowserStatus) {
    console.log(`Updating browser status: ${configName} -> ${status}`);
    this.browserStatuses[configName] = status;
    this.emit('statusChanged', configName, status);
  }

  public getStatus(configName: string): BrowserStatus {
    return this.browserStatuses[configName] || 'stopped';
  }

  public getAllStatuses(): Record<string, BrowserStatus> {
    return { ...this.browserStatuses };
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.removeAllListeners();
  }
} 