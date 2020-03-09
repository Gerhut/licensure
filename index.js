/*!
 * MIT License
 *
 * Copyright (c) 2020 George Cheng
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const fs = require('fs')
const path = require('path')

const debug = require('debug')('licensure')
const globby = require('globby')

/** @type {Object<string, string[]>} */
const commentFormats = require('./comment')

/**
 * @param {string} content
 * @param {string[]} format
 */
const commentify = (content, format) => {
  const lines = content.split('\n')
  const comments = format.length === 3
    ? lines.map((line) => (format[1] + line).trimRight())
    : lines.map((line) => (format[0] + line).trimRight())
  if (format.length === 3) {
    comments.unshift(format[0])
    comments.push(format[2])
  }
  return comments.join('\n')
}

class NoLicenseError extends Error {
  constructor (files) {
    super('No license content in the following files:\n' + files.join('\n'))
    this.files = files
    Object.defineProperty(this, 'files', {
      writable: false,
      configurable: false
    })
  }
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {string} options.license
 * @param {boolean} options.write
 * @throws {NoLicenseError}
 */
module.exports = async function ({ root, license, write }) {
  const licenseContent = (await fs.promises.readFile(license, 'utf8')).trim()

  const source = Object.keys(commentFormats).map(ext => `**/*.${ext}`)
  /** @type {Object<string, string>} */
  const licenseComments = Object.create(null)
  const noLicenseFiles = []

  debug('Scanning %o in %s', source, root)
  for await (const file of globby.stream(source, {
    cwd: root,
    followSymbolicLinks: false,
    absolute: true,
    onlyFiles: true,
    expandDirectories: false,
    gitignore: true
  })) {
    debug('Got file %s', file)
    const ext = path.extname(file).slice(1)
    if (!(ext in licenseComments)) {
      debug('Generating license comment for %s file by %o', ext, commentFormats[ext])
      licenseComments[ext] = commentify(licenseContent, commentFormats[ext])
    }
    const licenseComment = licenseComments[ext]
    const content = await fs.promises.readFile(file, 'utf8')

    let start = 0
    if (content.slice(0, 2) === '#!') {
      start = content.indexOf('\n') + 1
      if (start === 0) { // One line code
        start = content.length
      }
      debug('Found shebang in file %s, starts with index %d', file, start)
    }
    if (content.slice(start, start + licenseComment.length) !== licenseComment) {
      debug('Found no license in file %s', file)
      noLicenseFiles.push(file)
      if (write) {
        debug('Writing license back to file %s', file)
        await fs.promises.writeFile(file, [
          content.slice(0, start),
          licenseComment + '\n',
          content.slice(start)
        ].join(''))
      }
    }
  }

  if (noLicenseFiles.length > 0) {
    throw new NoLicenseError(noLicenseFiles)
  }
}
