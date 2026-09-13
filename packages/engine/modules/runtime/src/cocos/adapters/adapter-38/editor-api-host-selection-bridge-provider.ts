/**
 * @description Creator 3.8 `Editor.Selection` 最小接口。
 */
interface ICocosEditorSelectionApi {
  /** @description 读取指定类型选区。 */
  getSelected?(type: string): unknown;
  /** @description 选中。 */
  select?(type: string, ...ids: string[]): void | Promise<void>;
  /** @description 取消单个。 */
  unselect?(type: string, id: string): void | Promise<void>;
  /** @description 清空。 */
  clear?(): void | Promise<void>;
}

/**
 * @description 可能提供 Creator Selection API 的宿主全局对象。
 */
export interface IEditorApiSelectionHostGlobal extends Record<string, unknown> {
  /** @description Cocos Creator 主进程全局 API。 */
  readonly Editor?: {
    /** @description 选区 API。 */
    readonly Selection?: ICocosEditorSelectionApi;
  };
}

/**
 * @description 通过 Creator `Editor.Selection` 读写节点选区。
 */
export class EditorApiHostSelectionBridgeProvider {
  /** @description 节点选区类型名。 */
  private static readonly _nodeType = "node";

  /** @description Creator 主进程全局对象。 */
  private readonly _hostGlobal: IEditorApiSelectionHostGlobal;

  /**
   * @description 创建真实 Selection provider。
   * @param hostGlobal 可选宿主全局；默认 `globalThis`。
   */
  public constructor(hostGlobal?: IEditorApiSelectionHostGlobal) {
    this._hostGlobal =
      hostGlobal ?? (globalThis as IEditorApiSelectionHostGlobal);
  }

  /**
   * @description 当前宿主是否暴露可用的 Selection API。
   * @returns 可用时 true。
   */
  public isAvailable(): boolean {
    const selection = this._hostGlobal.Editor?.Selection;
    return (
      selection != null &&
      (typeof selection.getSelected === "function" ||
        typeof selection.select === "function")
    );
  }

  /**
   * @description 读取当前节点选区 id 列表。
   * @returns id 列表。
   */
  public async getActiveIds(): Promise<readonly string[]> {
    const selection = this._hostGlobal.Editor?.Selection;
    if (selection == null || typeof selection.getSelected !== "function") {
      return [];
    }
    const raw = selection.getSelected(
      EditorApiHostSelectionBridgeProvider._nodeType,
    );
    if (Array.isArray(raw)) {
      return raw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      return [raw.trim()];
    }
    return [];
  }

  /**
   * @description 设置当前节点选区。
   * @param selectionIds 节点 uuid 列表；空数组清空。
   * @returns Promise。
   */
  public async setActiveIds(selectionIds: readonly string[]): Promise<void> {
    const selection = this._hostGlobal.Editor?.Selection;
    if (selection == null) {
      throw new Error("cocos_editor_selection_api_unavailable");
    }
    const ids = selectionIds
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (ids.length === 0) {
      if (typeof selection.clear === "function") {
        await selection.clear();
        return;
      }
      if (typeof selection.select === "function") {
        await selection.select(EditorApiHostSelectionBridgeProvider._nodeType);
      }
      return;
    }
    if (typeof selection.select !== "function") {
      throw new Error("cocos_editor_selection_api_unavailable");
    }
    await selection.select(
      EditorApiHostSelectionBridgeProvider._nodeType,
      ...ids,
    );
  }
}
