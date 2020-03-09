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
/* eslint-env mocha */

const should = require('should')

const fs = require('fs')
const path = require('path')

const del = require('del')
const cpy = require('cpy')
const makeDir = require('make-dir')

const licensure = require('.')

describe('licensure', function () {
  const fixtures = path.join(__dirname, '.fixtures')
  const temp = path.join(fixtures, 'tmp')

  beforeEach(async function () {
    await makeDir(temp)
  })

  afterEach(async function () {
    await del(temp)
  })

  it('should find all code files without license comments', async function () {
    await cpy([
      path.join(fixtures, '*.js'),
      path.join(fixtures, '*.py'),
      path.join(fixtures, '*.json')
    ], temp)
    try {
      should(await licensure({
        root: temp,
        license: path.join(fixtures, 'license'),
        write: false
      })).fail()
    } catch (error) {
      should(error.files).be.containDeep([
        path.join(temp, 'foo.js'),
        path.join(temp, 'foo.py'),
        path.join(temp, 'shebang.py')
      ])
    }
  })

  it('should write back license comments when write is enabled', async function () {
    await cpy([
      path.join(fixtures, '*.js'),
      path.join(fixtures, '*.py'),
      path.join(fixtures, '*.json')
    ], temp)
    await should(licensure({
      root: temp,
      license: path.join(fixtures, 'license'),
      write: true
    })).be.rejected()
    should(await fs.promises.readFile(path.join(temp, 'foo.js'), 'utf8'))
      .equal(await fs.promises.readFile(path.join(temp, 'foo-licensed.js'), 'utf8'))
    should(await fs.promises.readFile(path.join(temp, 'foo.py'), 'utf8'))
      .equal(await fs.promises.readFile(path.join(temp, 'foo-licensed.py'), 'utf8'))
    should(await fs.promises.readFile(path.join(temp, 'foo.json'), 'utf8'))
      .equal(await fs.promises.readFile(path.join(fixtures, 'foo.json'), 'utf8'))
    should(await fs.promises.readFile(path.join(temp, 'shebang.py'), 'utf8'))
      .equal(await fs.promises.readFile(path.join(temp, 'shebang-licensed.py'), 'utf8'))
  })
})
