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
    defaultViewport?: {
      width: number;
      height: number;
    };
    args?: string[];
    userDataDir?: string;
    [key: string]: any;
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
    };
    audio: {
      sampleRate: number;
      channels: number;
    };
  };
} 