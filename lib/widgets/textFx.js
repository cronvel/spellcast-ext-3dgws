/*
	3D Graphics With Sounds

	Copyright (c) 2020 - 2025 Cédric Ronvel

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



const textFx = {} ;
module.exports = textFx ;



// Common constants
const HALF_PI = Math.PI / 2 ;
const TWO_PI = Math.PI * 2 ;



// Make the letter shake independently
textFx.shake = {
	initStatic: part => {
		part.splitIntoCharacters = true ;
	} ,
	initDynamic: ( part , widget , structuredTextBox ) => {
		var fontSize = parseFloat( part.fontSize ?? structuredTextBox.style?.fontSize ?? structuredTextBox.fontSize ) ;

		part.dynamicCustomData.deltaX = fontSize / 22 ;
		part.dynamicCustomData.deltaY = fontSize / 11 ;

		part.dynamicCustomData.x = part.metrics.x ;
		part.dynamicCustomData.baselineY = part.metrics.baselineY ;
	} ,
	update: part => {
		var dx = Math.round( ( 2 * Math.random() - 1 ) * part.dynamicCustomData.deltaX ) ,
			dy = Math.round( ( 2 * Math.random() - 1 ) * part.dynamicCustomData.deltaY ) ;

		part.metrics.x = part.dynamicCustomData.x + dx ;
		part.metrics.baselineY = part.dynamicCustomData.baselineY + dy ;
	} ,
	updateEvery: 3
} ;



// Make the text part bumps
textFx.bumpy = {
	initDynamic: ( part , widget , structuredTextBox ) => {
		var fontSize = parseFloat( part.fontSize ?? structuredTextBox.style?.fontSize ?? structuredTextBox.fontSize ) ;
		part.dynamicCustomData.deltaY = fontSize / 3 ;
		part.dynamicCustomData.baselineY = part.metrics.baselineY ;
	} ,
	update: ( part , widget ) => {
		var period = 40 ;
		var dy = -Math.round( part.dynamicCustomData.deltaY * 0.5 * ( 1 + Math.sin( -HALF_PI + widget.fxUpdateCount * TWO_PI / period ) ) ) ;
		part.metrics.baselineY = part.dynamicCustomData.baselineY + dy ;
	} ,
	updateEvery: 2
} ;



const OLA_PHASE_OFFSET = Math.PI / 10 ;

// Like bumpy, but each letter is moving independently with a phase
textFx.ola = {
	initStatic: part => {
		part.splitIntoCharacters = true ;
	} ,
	initDynamic: ( part , widget , structuredTextBox ) => {
		var fontSize = parseFloat( part.fontSize ?? structuredTextBox.style?.fontSize ?? structuredTextBox.fontSize ) ;
		part.dynamicCustomData.deltaY = fontSize / 3 ;
		part.dynamicCustomData.baselineY = part.metrics.baselineY ;
	} ,
	update: ( part , widget , structuredTextBox , index ) => {
		var period = 40 ;
		var dy = -Math.round( part.dynamicCustomData.deltaY * 0.5 * ( 1 + Math.sin( -HALF_PI - index * OLA_PHASE_OFFSET + widget.fxUpdateCount * TWO_PI / period ) ) ) ;
		part.metrics.baselineY = part.dynamicCustomData.baselineY + dy ;
	} ,
	updateEvery: 2
} ;



const RAINBOW = [
	"#ff000d" , // red
	"#ef9000" , // orange
	"#fffd00" , // yellow
	"#66ff00" , // green
	"#0085fc" , // blue
	"#2f00ff" , // indigo
	"#bd00ed" // violet
] ;

textFx.rainbow = {
	initStatic: part => {
		part.splitIntoCharacters = true ;
	} ,
	update: ( part , widget , structuredTextBox , index ) => {
		var colorIndex = ( index + widget.fxUpdateCount / textFx.rainbow.updateEvery ) % RAINBOW.length ;
		part.color = RAINBOW[ colorIndex ] ;
	} ,
	updateEvery: 10
} ;

