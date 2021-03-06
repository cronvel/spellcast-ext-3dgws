/*
	3D Ground With Sprites

	Copyright (c) 2020 - 2021 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const BrowserExm = require( 'exm/lib/BrowserExm.js' ) ;
const path = require( 'path' ) ;



const extension = BrowserExm.registerExtension( {
	module ,
	ns: 'spellcast.web-client' ,
	id: '3dgws' ,
	exports: {} ,
	hooks: {
		init: async () => {
			console.warn( "Extension 3DGWS: starting init" ) ;
			await import( extension.dirPath + '/babylonjs.js' ) ;
			await import( extension.dirPath + '/babylonjs.gui.js' ) ;
			await import( extension.dirPath + '/cannon.js' ) ;
			extension.host.api.addEngine( '3dgws' , require( './engine.js' ) ) ;
			console.warn( "Extension 3DGWS fully loaded" ) ;
		}
	}
} ) ;

module.exports = extension ;

