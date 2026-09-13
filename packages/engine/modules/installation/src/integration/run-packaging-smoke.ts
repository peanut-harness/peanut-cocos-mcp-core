import { PackagingSmokeHarness } from './packaging-smoke-harness.js';

(async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ packagingSmokeHarness = new PackagingSmokeHarness();
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packagingSmokeResult = await packagingSmokeHarness.run();
    console.log(JSON.stringify(packagingSmokeResult));
})();
