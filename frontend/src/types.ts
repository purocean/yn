export namespace Components {
  export namespace Modal {
    export type ConfirmModalParams = { title?: string; content?: string }

    export type InputModalParams = {
      type?: string;
      title?: string;
      content?: string;
      value?: string;
      hint?: string;
      modalWidth?: string;
      select?: boolean | [number, number, 'forward' | 'backward' | 'none'];
    }
  }

  export namespace Toast {
    export type ToastType = 'warning' | 'info'
  }

  export namespace ContextMenu {
    export type SeparatorItem = { type: 'separator' }

    export type NormalItem = {
      type?: 'normal';
      id: string;
      label: string;
      onClick: (item?: NormalItem) => void;
    }

    export type Item = SeparatorItem | NormalItem
  }

  export namespace Tabs {
    export interface Item {
      key: string;
      label: string;
      description?: string;
      payload: any;
      fixed?: boolean;
    }
  }

  export namespace FileTabs {
    export interface Item extends Tabs.Item {
      payload: {
        file: any; // TODO 文件类型
      };
    }
  }
}
