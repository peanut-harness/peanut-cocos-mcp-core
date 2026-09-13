import type { ICreatorAdapter } from '../../adapters/core/creator-adapter.js';
import { AdapterRegistry } from '../../adapters/core/adapter-registry.js';
import { VersionResolver } from '../../version/version-resolver.js';

/**
 * @description Project 子域服务接口。
 */
export interface IProjectRuntimeService {
    /**
     * @description 返回当前项目根目录。
     * @returns Promise 返回项目根目录；未知时返回 `null`
     */
    getProjectPath(): Promise<string | null>;

    /**
     * @description 返回当前项目显示名称。
     * @returns Promise 返回项目显示名称；未知时返回 `null`
     */
    getProjectName(): Promise<string | null>;

    /**
     * @description 更新当前项目基础信息。
     * @param projectPath 当前项目根目录
     * @param projectName 当前项目显示名称
     * @returns Promise 在本地状态更新后结束
     */
    configure(projectPath: string | null, projectName: string | null): Promise<void>;
}

/**
 * @description Project 子域运行时服务。
 */
export class ProjectRuntimeService implements IProjectRuntimeService {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _adapterRegistry: AdapterRegistry;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _versionResolver: VersionResolver;

    /**
     * @description 创建一个新的 Project 子域服务。
     * @param adapterRegistry 适配器注册中心
     * @param versionResolver Creator 版本解析器
     */
    public constructor(adapterRegistry: AdapterRegistry, versionResolver: VersionResolver) {
        this._adapterRegistry = adapterRegistry;
        this._versionResolver = versionResolver;
    }

    /**
     * @description 返回当前项目根目录。
     * @returns Promise 返回项目根目录；未知时返回 `null`
     */
    public async getProjectPath(): Promise<string | null> {
        return this._getActiveAdapter().createProjectBridge().getProjectPath();
    }

    /**
     * @description 返回当前项目显示名称。
     * @returns Promise 返回项目显示名称；未知时返回 `null`
     */
    public async getProjectName(): Promise<string | null> {
        return this._getActiveAdapter().createProjectBridge().getProjectName();
    }

    /**
     * @description 更新当前项目基础信息。
     * @param projectPath 当前项目根目录
     * @param projectName 当前项目显示名称
     * @returns Promise 在本地状态更新后结束
     */
    public async configure(projectPath: string | null, projectName: string | null): Promise<void> {
        await this._getActiveAdapter().createProjectBridge().configure(projectPath, projectName);
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _getActiveAdapter(): ICreatorAdapter {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ creatorVersion = this._versionResolver.getCurrentVersion().raw;
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ adapter = this._adapterRegistry.resolve(creatorVersion);
        if (adapter == null) {
            throw new Error(`No Creator adapter registered for version "${creatorVersion}".`);
        }
        return adapter;
    }
}
