'use strict';

const { createHash, randomBytes, webcrypto } = require('crypto');
const { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } = require('fs');
const { isAbsolute, join, relative, resolve, sep } = require('path');

const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const PURPOSE_PATTERN = /^[a-z0-9][a-z0-9.-]{0,127}$/u;

/**
 * Persists encrypted HMAC material with Electron safeStorage and exposes only non-extractable WebCrypto keys.
 */
class SystemProtectedKeyStore {
    constructor(projectPath, pluginId, safeStorageProvider) {
        if (!PLUGIN_ID_PATTERN.test(pluginId) || typeof safeStorageProvider !== 'function') {
            throw new Error('peanut_cpm_protected_key_store_input_invalid');
        }
        this.projectPath = realpathSync(resolve(projectPath));
        this.directoryPath = resolve(this.projectPath, 'peanut-plugins', 'protected-keys', pluginId);
        this.safeStorageProvider = safeStorageProvider;
        this.keys = new Map();
    }

    async getOrCreateHmacSha256Key(purpose) {
        if (typeof purpose !== 'string' || !PURPOSE_PATTERN.test(purpose)) {
            throw new Error('peanut_cpm_protected_key_purpose_invalid');
        }
        const existing = this.keys.get(purpose);
        if (existing !== undefined) {
            return existing;
        }
        const pending = this.loadOrCreateKey(purpose);
        this.keys.set(purpose, pending);
        try {
            return await pending;
        } catch (error) {
            this.keys.delete(purpose);
            throw error;
        }
    }

    async loadOrCreateKey(purpose) {
        const safeStorage = this.requireSafeStorage();
        mkdirSync(this.directoryPath, { recursive: true, mode: 0o700 });
        const realDirectoryPath = realpathSync(this.directoryPath);
        const directoryChild = relative(this.projectPath, realDirectoryPath);
        if (
            lstatSync(this.directoryPath).isSymbolicLink() ||
            directoryChild.length === 0 ||
            isAbsolute(directoryChild) ||
            directoryChild === '..' ||
            directoryChild.startsWith(`..${sep}`)
        ) {
            throw new Error('peanut_cpm_protected_key_directory_invalid');
        }
        const keyFileName = `${createHash('sha256').update(purpose).digest('hex')}.key`;
        const keyPath = join(this.directoryPath, keyFileName);
        let keyBytes;
        if (existsSync(keyPath)) {
            keyBytes = this.decryptKey(safeStorage, this.readEncryptedKey(keyPath));
        } else {
            keyBytes = randomBytes(32);
            const encrypted = safeStorage.encryptString(keyBytes.toString('base64'));
            if (!Buffer.isBuffer(encrypted) || encrypted.length === 0 || encrypted.length > 16_384) {
                keyBytes.fill(0);
                throw new Error('peanut_cpm_protected_key_encrypt_failed');
            }
            try {
                writeFileSync(keyPath, encrypted, { flag: 'wx', mode: 0o600 });
            } catch (error) {
                keyBytes.fill(0);
                if (error?.code !== 'EEXIST') {
                    throw error;
                }
                keyBytes = this.decryptKey(safeStorage, this.readEncryptedKey(keyPath));
            }
        }
        try {
            return await webcrypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        } finally {
            keyBytes.fill(0);
        }
    }

    requireSafeStorage() {
        const safeStorage = this.safeStorageProvider();
        if (
            safeStorage === null ||
            typeof safeStorage !== 'object' ||
            typeof safeStorage.isEncryptionAvailable !== 'function' ||
            safeStorage.isEncryptionAvailable() !== true ||
            typeof safeStorage.encryptString !== 'function' ||
            typeof safeStorage.decryptString !== 'function'
        ) {
            throw new Error('peanut_cpm_system_protected_storage_unavailable');
        }
        const backend = typeof safeStorage.getSelectedStorageBackend === 'function' ? safeStorage.getSelectedStorageBackend() : null;
        if (backend === 'basic_text') {
            throw new Error('peanut_cpm_system_protected_storage_insecure');
        }
        return safeStorage;
    }

    decryptKey(safeStorage, encrypted) {
        let plainText;
        try {
            plainText = safeStorage.decryptString(encrypted);
        } catch {
            throw new Error('peanut_cpm_protected_key_decrypt_failed');
        }
        if (typeof plainText !== 'string' || !/^[A-Za-z0-9+/]{43}=$/u.test(plainText)) {
            throw new Error('peanut_cpm_protected_key_material_invalid');
        }
        const keyBytes = Buffer.from(plainText, 'base64');
        if (keyBytes.length !== 32) {
            keyBytes.fill(0);
            throw new Error('peanut_cpm_protected_key_material_invalid');
        }
        return keyBytes;
    }

    readEncryptedKey(keyPath) {
        const stat = lstatSync(keyPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > 16_384) {
            throw new Error('peanut_cpm_protected_key_file_invalid');
        }
        return readFileSync(keyPath);
    }

    clear() {
        this.keys.clear();
    }
}

module.exports = { SystemProtectedKeyStore };
