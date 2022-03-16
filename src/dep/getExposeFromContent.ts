import assert from 'assert';
import {basename} from 'path';
import {Dep} from './dep';
import {getModuleExports} from './getModuleExports';

export async function getExposeFromContent(opts: {
    dep: Dep;
    filePath: string;
    content: string;
}) {
    // Support CSS
    if (
        opts.filePath &&
        /\.(css|less|scss|sass|stylus|styl)$/.test(opts.filePath)
    ) {
        return `import '${opts.dep.request}';`;
    }

    // Support Assets Files
    if (
        opts.filePath &&
        /\.(json|svg|png|jpe?g|avif|gif|webp|ico|eot|woff|woff2|ttf|txt|text|mdx?)$/.test(
            opts.filePath
        )
    ) {
        return `
import _ from '${opts.dep.request}';
export default _;`.trim();
    }

    assert(
        /(js|jsx|mjs|ts|tsx)$/.test(opts.filePath),
        `file type not supported for ${basename(opts.filePath)}.`
    );
    const {exports, isCJS} = await getModuleExports({
        content: opts.content,
        filePath: opts.filePath
    });
    // cjs
    // console.log("-> filePath", opts.filePath);
    // console.log("-> isCJS", isCJS, exports);
    if (isCJS) {
        return [
            `import _ from '${opts.dep.request}';`,
            `export default _;`,
            `export * from '${opts.dep.request}';`
        ].join('\n');
    }
    // esm
    else {
        const ret = [];
        let hasExports = false;
        if (exports.includes('default')) {
            ret.push(`import _ from '${opts.dep.request}';`);
            ret.push(`export default _;`);
            hasExports = true;
        }
        if (
            hasNonDefaultExports(exports) ||
            // export * from 不会有 exports，只会有 imports
            /export\s+\*\s+from/.test(opts.content)
        ) {
            ret.push(`export * from '${opts.dep.request}';`);
            hasExports = true;
        }

        if (!hasExports) {
            // 只有 __esModule 的全量导出
            if (exports.includes('__esModule') && exports.length > 1) {
                ret.push(`import _ from '${opts.dep.request}';`);
                ret.push(`export default _;`);
                ret.push(`export * from '${opts.dep.request}';`);
            } else {
                ret.push(`import '${opts.dep.request}';`);
            }
        }

        return ret.join('\n');
    }
}

function hasNonDefaultExports(exports: any) {
    return (
        exports.filter((exp: string) => !['__esModule', 'default'].includes(exp))
            .length > 0
    );
}
