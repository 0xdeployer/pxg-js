const path = require("path");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const BundleAnalyzerPlugin =
  //@ts-ignore
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: {
      name: "pxgjs",
      type: "umd",
    },
  },
  devtool: "source-map",
  plugins: [new NodePolyfillPlugin(), new BundleAnalyzerPlugin()],
  module: {
    rules: [
      {
        test: /\.(t|j)s$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            exclude: [/node_modules/],
            plugins: ["@babel/plugin-transform-runtime"],
            presets: [
              [
                "@babel/env",
                {
                  targets: "defaults, maintained node versions",
                  useBuiltIns: "usage",
                  corejs: "3.6.5",
                },
              ],
              "@babel/preset-typescript",
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".json", ".ts", ".js"],
    alias: {
      "bn.js": path.resolve("./node_modules/bn.js"),
    },
  },
};
