'use strict';

const POD_PRO_PRODUCT_CODE = 'peanut.cocos-mcp-pro';
const POD_PRO_PACKAGE_ID = 'peanut.cocos-mcp-pro';

const offer = Object.freeze({
    productCode: POD_PRO_PRODUCT_CODE,
    packageId: POD_PRO_PACKAGE_ID,
    entitlements: Object.freeze([
        'premium.snowb',
        'premium.preview-capture',
        'premium.content-delivery',
        'premium.sdf-font',
        'premium.ui-prefab',
        'premium.asset-version-mover',
    ]),
});

function listPremiumOffer() {
    return offer;
}

module.exports = { POD_PRO_PACKAGE_ID, POD_PRO_PRODUCT_CODE, listPremiumOffer };
