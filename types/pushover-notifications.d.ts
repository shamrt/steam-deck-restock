declare module "pushover-notifications" {
  interface PushoverConfig {
    user: string;
    token: string;
  }

  interface PushoverMessage {
    message: string;
    title?: string;
    priority?: number;
    sound?: string;
  }

  interface PushoverResult {
    status: number;
    request: string;
  }

  class Push {
    constructor(config: PushoverConfig);
    send(
      message: PushoverMessage,
      callback: (error: Error | null, result: PushoverResult) => void
    ): void;
  }

  export = Push;
}
