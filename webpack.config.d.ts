export const mode: string;
export const entry: string;
export namespace output {
    const path: string;
    const filename: string;
    namespace library {
        const name: string;
        const type: string;
    }
}
export const devtool: string;
export const plugins: any[];
export namespace module {
    const rules: {
        test: RegExp;
        exclude: RegExp;
        use: {
            loader: string;
            options: {
                exclude: RegExp[];
                plugins: string[];
                presets: (string | (string | {
                    targets: string;
                    useBuiltIns: string;
                    corejs: string;
                })[])[];
            };
        };
    }[];
}
export namespace resolve {
    const extensions: string[];
    const alias: {
        "bn.js": string;
    };
}
