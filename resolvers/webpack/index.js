const findRoot = require('find-root')
    , path = require('path')
    , resolve = require('resolve')

/**
 * Find the full path to 'source', given 'file' as a full reference path.
 *
 * resolveImport('./foo', '/Users/ben/bar.js') => '/Users/ben/foo.js'
 * @param  {string} source - the module to resolve; i.e './some-module'
 * @param  {string} file - the importing file's full path; i.e. '/usr/local/bin/file.js'
 * TODO: take options as a third param, with webpack config file name
 * @return {string?} the resolved path to source, undefined if not resolved, or null
 *                   if resolved to a non-FS resource (i.e. script tag at page load)
 */
exports.resolveImport = function resolveImport(source, file) {
  const packageDir = findRoot(file)
  if (!packageDir) throw new Error('package not found above ' + file)

  const webpackConfig = require(path.join(packageDir, 'webpack.config.js'))
  if (!webpackConfig.resolve) throw new Error('no custom webpack resolve config')

  // simple alias lookup
  if (webpackConfig.resolve.alias &&
      source in webpackConfig.resolve.alias) {
    return webpackConfig.resolve.alias[source]
  }

  // externals
  if (findExternal(source, webpackConfig.externals)) return null

  const paths = []
  // root as first alternate path
  if (webpackConfig.resolve.root) {
    paths.push(webpackConfig.resolve.root)
  }

  // otherwise, resolve "normally"
  return resolve.sync(source, {
    basedir: path.dirname(file),

    // defined via http://webpack.github.io/docs/configuration.html#resolve-extensions
    extensions: webpackConfig.resolve.extensions || ['', '.webpack.js', '.web.js', '.js'],

    // http://webpack.github.io/docs/configuration.html#resolve-modulesdirectories
    moduleDirectory: webpackConfig.resolve.modulesDirectories || ['web_modules', 'node_modules'],

    paths,
  })
}

function findExternal(source, externals) {
  if (!externals) return false

  // string match
  if (typeof externals === 'string') return (source === externals)

  // array: recurse
  if (externals instanceof Array) {
    return externals.some(e => findExternal(source, e))
  }

  if (externals instanceof RegExp) {
    return externals.test(source)
  }

  if (typeof externals === 'function') {
    throw new Error('unable to handle function externals')
  }

  // else, vanilla object
  return Object.keys(externals).some(e => source === e)
}
