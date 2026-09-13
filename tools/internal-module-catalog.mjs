import { readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

const GROUP_ROOTS = Object.freeze({
    engine: 'packages/engine/modules',
    hosts: 'packages/hosts/modules',
});

/**
 * @description 从内部模块 manifest 构建可验证、可拓扑排序的执行目录。
 */
export class InternalModuleCatalog {
    /**
     * @description 创建内部模块目录读取器。
     * @param repositoryRoot Lite 仓库根目录。
     */
    constructor(repositoryRoot) {
        this._repositoryRoot = resolve(repositoryRoot);
    }

    /**
     * @description 返回所有受支持的内部模块组。
     * @returns 稳定排序的模块组名称。
     */
    listGroups() {
        return Object.freeze(Object.keys(GROUP_ROOTS));
    }

    /**
     * @description 发现并按内部依赖拓扑排序指定模块组。
     * @param group 模块组名称。
     * @returns 可按顺序执行任务的不可变模块记录。
     */
    list(group) {
        const groupRoot = GROUP_ROOTS[group];
        if (groupRoot == null) {
            throw new Error(`unknown_internal_group:${String(group)}`);
        }
        const absoluteGroupRoot = resolve(this._repositoryRoot, groupRoot);
        const modules = readdirSync(absoluteGroupRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => this._readModule(group, absoluteGroupRoot, entry.name));
        return Object.freeze(this._sortByDependencies(group, modules));
    }

    /**
     * @description 读取并验证单个内部模块 manifest。
     * @param group 模块组名称。
     * @param absoluteGroupRoot 模块组绝对目录。
     * @param directoryName 模块目录名。
     * @returns 已验证的内部模块记录。
     */
    _readModule(group, absoluteGroupRoot, directoryName) {
        const directory = resolve(absoluteGroupRoot, directoryName);
        const relativeDirectory = relative(absoluteGroupRoot, directory);
        if (relativeDirectory.startsWith('..') || isAbsolute(relativeDirectory)) {
            throw new Error(`internal_module_path_escape:${group}:${directoryName}`);
        }
        const manifestPath = join(directory, 'package.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
            throw new Error(`internal_module_name_invalid:${group}:${directoryName}`);
        }
        const internalDependencies = manifest.peanut?.internalDependencies ?? [];
        if (
            !Array.isArray(internalDependencies) ||
            internalDependencies.some((dependencyName) => typeof dependencyName !== 'string') ||
            new Set(internalDependencies).size !== internalDependencies.length
        ) {
            throw new Error(`internal_module_dependencies_invalid:${manifest.name}`);
        }
        return Object.freeze({
            group,
            name: manifest.name,
            path: relative(this._repositoryRoot, directory).replaceAll('\\', '/'),
            directory,
            manifest: Object.freeze(manifest),
            internalDependencies: Object.freeze([...internalDependencies]),
        });
    }

    /**
     * @description 按 manifest 声明的内部依赖生成稳定拓扑顺序。
     * @param group 模块组名称。
     * @param modules 待排序模块记录。
     * @returns 依赖优先的模块记录。
     */
    _sortByDependencies(group, modules) {
        const modulesByName = new Map();
        for (const moduleRecord of modules) {
            if (modulesByName.has(moduleRecord.name)) {
                throw new Error(`internal_module_name_duplicate:${group}:${moduleRecord.name}`);
            }
            modulesByName.set(moduleRecord.name, moduleRecord);
        }
        const visiting = new Set();
        const visited = new Set();
        const ordered = [];
        const visit = (moduleRecord) => {
            if (visited.has(moduleRecord.name)) {
                return;
            }
            if (visiting.has(moduleRecord.name)) {
                throw new Error(`internal_module_dependency_cycle:${group}:${moduleRecord.name}`);
            }
            visiting.add(moduleRecord.name);
            for (const dependencyName of moduleRecord.internalDependencies) {
                const dependency = modulesByName.get(dependencyName);
                if (dependency == null) {
                    throw new Error(`internal_module_dependency_missing:${moduleRecord.name}:${dependencyName}`);
                }
                visit(dependency);
            }
            visiting.delete(moduleRecord.name);
            visited.add(moduleRecord.name);
            ordered.push(moduleRecord);
        };
        for (const moduleRecord of [...modules].sort((left, right) => left.name.localeCompare(right.name))) {
            visit(moduleRecord);
        }
        return ordered;
    }
}
