import type { DesignSourceCapabilityId, IDesignSourceCapabilityDescriptor } from '../shared/plugin-manager-contracts.js';

const DESIGN_SOURCE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/u;
const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9.-]{0,127}$/u;

/** @description 宿主侧设计来源 capability 注册表；仅保存可公开的可用性状态。 */
export class DesignSourceCapabilityRegistry {
    /** @description 按稳定来源标识保存的当前 capability 描述。 */
    private readonly _sources = new Map<DesignSourceCapabilityId, IDesignSourceCapabilityDescriptor>();

    /** @description 用新的宿主验证结果替换全部设计来源状态。 */
    public replace(sources: readonly IDesignSourceCapabilityDescriptor[]): void {
        const nextSources = new Map<DesignSourceCapabilityId, IDesignSourceCapabilityDescriptor>();
        for (const source of sources) {
            if (!DESIGN_SOURCE_ID_PATTERN.test(source.id)) {
                throw new Error(`design_source_capability_id_invalid:${source.id}`);
            }
            if (source.providerPluginId != null && !PLUGIN_ID_PATTERN.test(source.providerPluginId)) {
                throw new Error(`design_source_capability_provider_invalid:${source.id}`);
            }
            if (nextSources.has(source.id)) {
                throw new Error(`design_source_capability_duplicate:${source.id}`);
            }
            if (source.available && source.reason != null) {
                throw new Error(`design_source_capability_reason_conflict:${source.id}`);
            }
            nextSources.set(source.id, {
                id: source.id,
                available: source.available,
                ...(source.providerPluginId == null ? {} : { providerPluginId: source.providerPluginId }),
                ...(source.displayName == null ? {} : { displayName: source.displayName }),
                ...(source.version == null ? {} : { version: source.version }),
                ...(source.reason == null ? {} : { reason: source.reason }),
            });
        }
        this._sources.clear();
        for (const [id, source] of nextSources) {
            this._sources.set(id, source);
        }
    }

    /** @description 返回按来源标识排序的可公开 capability 快照。 */
    public describe(): readonly IDesignSourceCapabilityDescriptor[] {
        return [...this._sources.values()].sort((left, right) => left.id.localeCompare(right.id));
    }
}
