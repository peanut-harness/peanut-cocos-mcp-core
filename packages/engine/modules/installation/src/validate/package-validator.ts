import type { IPluginPackageInspection, IPluginPackageValidationResult } from '@peanut/pod-protocol';

/**
 * @description 插件包校验器，负责校验包结构、版本约束和基础元信息。
 */
export class PackageValidator {
    /**
     * @description 校验一个插件包检查结果。
     * @param packageInspection 插件包检查结果
     * @returns Promise 返回结构化校验结果
     */
    public async validate(packageInspection: IPluginPackageInspection): Promise<IPluginPackageValidationResult> {
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ issues = [...packageInspection.issues];
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ warnings: string[] = [];

        if (!packageInspection.isValidStructure) {
            return {
                ok: false,
                issues,
                warnings,
            };
        }

        if (packageInspection.manifest == null) {
            issues.push('manifest_missing');
        }
        if (packageInspection.packageMeta == null) {
            issues.push('package_meta_missing');
        }

        if (packageInspection.manifest != null) {
            if (packageInspection.manifest.engines.host.trim().length === 0) {
                issues.push('host_engine_range_missing');
            }
            if (packageInspection.manifest.engines.creator != null && packageInspection.manifest.engines.creator.trim().length === 0) {
                issues.push('creator_engine_range_empty');
            }
        }

        if (packageInspection.packageMeta?.signature == null) {
            warnings.push('package_signature_missing');
        }

        return {
            ok: issues.length === 0,
            issues,
            warnings,
        };
    }
}
