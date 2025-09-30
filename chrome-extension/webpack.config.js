const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    background: "./src/background.js",
    popup: "./src/popup.js",
    "content-script": "./src/content-script.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-transform-modules-commonjs"],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false,
      fs: false,
      path: false,
    },
  },
  optimization: {
    minimize: false, // Para facilitar debug
  },
};
