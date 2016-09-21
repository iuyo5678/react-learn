'use strict';
var _ = require('lodash');
var resolve = require('path').resolve;
var join = require('path').join;
const Hapi = require('hapi');
var webpack = require('webpack');
var transferWebpackPlugin = require('transfer-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

process.env.NODE_ENV = 'production';

const server = new Hapi.Server();
server.connection({
    port: 3000
});

// 所有需要注册的插件
var serverPlugins = {
    'vision': {},
    'inert': {}
};

var commonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;
var uglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

var webpackConfig = {
    entry: {
        index: resolve(__dirname, './client/home/index.entry.js')
    },
    output: {
        path:  resolve(__dirname, './public/pages'),
        filename: '[name].min.js',
        sourceMapFilename: '[name].map.js'
    },
    resolve: {
        extensions: ['', '.js', '.jsx', '.less']
    },
    module: {
        loaders: [
            { test: /\.less$/,
                loader: ExtractTextPlugin.extract(
                    "style-loader", "css-loader!less-loader"
                )
            },
            {
                test: /\.jsx?$/,         // Match both .js and .jsx files
                exclude: /node_modules/,
                loader: "babel",
                query:
                {
                    presets:['react']
                }
            },
            { test: /\.scss$/, loader: 'style!css!sass?sourceMap'},
            { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192'}
        ]
    },
    devtool: 'source-map',
    plugins: [
        new commonsChunkPlugin('../core.min.js', undefined, 2),
        new uglifyJsPlugin({compress: {warnings: false}}),
        new ExtractTextPlugin('../style/[name].style.css'),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            },
        }),
        new transferWebpackPlugin([
            {from: resolve(__dirname, './client/components/media'), to: '../../public/media'},
        ])
    ]
};

webpack(webpackConfig, function (err, stats) {
    if (err) {
        console.log(err);
    }
});


// 依次注册各个插件
var pluginNames = _.keys(serverPlugins);
_.forEach(pluginNames, function (name) {
    server.register({
        register: require(name),
        options: serverPlugins[name]
    }, function (err) {
        if (err) {
            console.log('error', 'failed to register plugin: ' + name);
        }
        console.log('info', 'Server register plugin: ' + name);
    });
});

// 配置模板解析引擎，jsx 使用hapi-react-views
server.views({
    engines: {
        html: require('handlebars')
    },
    relativeTo: __dirname,
    path: './web'
});

server.route({
    method: 'GET',
    path: '/public/{file*}',
    handler: {
        directory: {
            path: 'public'
        }
    }
});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {

        return reply.view('home/index');
    }
});

// 等待100毫秒再开启服务器，因为hapi-mongo-models加载比较慢
setTimeout(function(){
    server.on('response', function (request) {
        console.log(request.info.remoteAddress + ': ' + request.method.toUpperCase() + ' ' + request.url.path + ' --> ' + request.response.statusCode);
    });

    server.start(function () {
        console.log('info', 'Server running at: ' + server.info.uri);
    });
},100);

