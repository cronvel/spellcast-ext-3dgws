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

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



const SHAPE_CLASS = {
	sphere: 'CreateSphere'
} ;



function GEntityBasicShape( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	this.shapeClass = null ;
	this.shapeParams = {} ;
}

GEntityBasicShape.prototype = Object.create( GEntity.prototype ) ;
GEntityBasicShape.prototype.constructor = GEntityBasicShape ;

module.exports = GEntityBasicShape ;



GEntityBasicShape.prototype.updateSpecialStage1 = function( data ) {
	GEntity.prototype.updateSpecialStage1.call( this , data ) ;

	if ( data.special.shape && typeof data.special.shape === 'object' ) {
		if ( data.special.shape && SHAPE_CLASS[ data.special.shape.type ] ) {
			this.shapeClass = SHAPE_CLASS[ data.special.shape.type ] ;
		}

		Object.assign( this.shapeParams , data.special.shape ) ;
		this.updateMeshNeeded = true ;
	}
} ;



GEntityBasicShape.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	console.warn( '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ GEntityBasicShape.updateMesh()' , this.shapeClass ) ;
	if ( ! this.shapeClass ) { return ; }
	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.MeshBuilder[ this.shapeClass ]( 'basic-shape' , this.shapeParams , scene ) ;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;
	mesh.scaling.z = this.size.z ;

	console.warn( '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

