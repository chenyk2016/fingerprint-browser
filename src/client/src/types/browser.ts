export interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

export interface BrowserFormData {
  browserType: string;
  headless: boolean;
  [key: string]: any;
}

export interface BrowserConfig {
  name: string;
  options: {
    headless: boolean;
    defaultViewport?: null;
    args?: string[];
    userDataDir?: string;
    env?: Record<string, string>;
    ignoreDefaultArgs?: string[];
    ignoreHTTPSErrors?: boolean;
  };
  fingerprint?: {
    navigator: {
      userAgent: string;
      platform: string;
      language: string;
      languages: string[];
      hardwareConcurrency: number;
      deviceMemory: number;
    };
    screen: {
      width: number;
      height: number;
      colorDepth: number;
      pixelDepth: number;
    };
    webgl: {
      vendor: string;
      renderer: string;
      vendorHash?: string;
      rendererHash?: string;
    };
    audio: {
      sampleRate: number;
      channels: number;
    };
    timezone?: {
      offset: number;
      zone: string;
    };
  };
} 