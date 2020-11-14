/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const extension = require( './browser-extension.js' ) ;
const operators = extension.host.exports.expressionOperators ;



// !CHANGE HERE MUST BE REFLECTED IN SERVER's Parametric! E.g.: spellcast-ext-web-client/lib/Parametric.js
function Parametric( data ) {
	this.var = {} ;
	this.formula = {} ;
	this.ctx = {
		t: 0 ,
		rt: 0 ,		// relative t, relative to stopAt (rt=1 if t=stopAt)
		tOffset: - Date.now() / 1000
	} ;
	this.computed = {} ;
	this.stopAt = Infinity ;
	this.cleanStop = false ;

	this.update( data ) ;
}

module.exports = Parametric ;



function emptyObject( object ) {
	var key ;
	for ( key in object ) {
		delete object[ key ] ;
	}
}



// !CHANGE HERE MUST BE REFLECTED IN SERVER's Parametric! E.g.: spellcast-ext-web-client/lib/Parametric.js
Parametric.prototype.update = function( data ) {
	if ( data.reset ) {
		emptyObject( this.var ) ;
		emptyObject( this.formula ) ;
		emptyObject( this.ctx ) ;
		emptyObject( this.computed ) ;
		this.ctx.t = this.ctx.rt = 0 ;
		this.ctx.tOffset = - Date.now() / 1000 ;
	}
	else if ( data.resetT ) {
		this.ctx.tOffset = - Date.now() / 1000 ;
	}

	if ( typeof data.stopAt === 'number' ) {
		this.stopAt = data.stopAt ;
	}

	if ( data.var ) {
		this.recursiveUpdate( this.var , data.var ) ;
	}

	if ( data.formula ) {
		this.recursiveUpdate( this.formula , data.formula , this.computed ) ;
	}
} ;



Parametric.prototype.recursiveUpdate = function( self , data , computed ) {
	var key , value ;

	for ( key in data ) {
		value = data[ key ] ;

		if ( typeof value === null ) {
			// We destroy that parametric formula along with any computed value
			delete self[ key ] ;
			if ( computed && typeof computed[ key ] === 'object' ) { delete computed[ key ] ; }
		}
		else if ( typeof value === 'boolean' || typeof value === 'number' ) {
			self[ key ] = value ;
		}
		else if ( typeof value === 'string' ) {
			self[ key ] = new Function( 'op' , 'ctx' , 'return ( ' + value + ' ) ;' ) ;
			//self[ key ] = new Function( 'ctx' , 'return ( ' + value + ' ) ;' ) ;
		}
		else if ( typeof value === 'object' ) {
			self[ key ] = {} ;	// Don't share with eventData
			this.recursiveUpdate(
				self[ key ] ,
				value ,
				computed && typeof computed[ key ] === 'object' ? computed[ key ] : null
			) ;
		}
		
		console.warn( "########## k/v/V" , key , value , self[ key ] ) ;
	}
} ;



Parametric.prototype.compute = function( absoluteT , base ) {
	this.ctx.t = absoluteT + this.ctx.tOffset ;

	if ( this.ctx.t > this.stopAt ) {
		if ( this.cleanStop ) { return null ; }
		this.ctx.t = this.stopAt ;
		this.cleanStop = true ;
	}
	else if ( this.ctx.t === this.stopAt ) {
		this.cleanStop = true ;
	}

	this.ctx.rt = this.ctx.t / this.stopAt ;

	// /!\ RESET COMPUTED?
	this.recursiveCompute( this.var , this.ctx ) ;
	this.recursiveCompute( this.formula , this.computed , base ) ;
	
	return this.computed ;
} ;



Parametric.prototype.recursiveCompute = function( self , computed , base ) {
	var key , value , baseValue ;

	for ( key in self ) {
		value = self[ key ] ;
		baseValue = base && typeof base === 'object' ? base[ key ] : undefined ;

		if ( typeof value === 'boolean' || typeof value === 'number' ) {
			computed[ key ] = value ;
		}
		else if ( typeof value === 'function' ) {
			this.ctx.base = baseValue ;
			computed[ key ] = value( operators , this.ctx ) ;
			//computed[ key ] = value( this.ctx ) ;
		}
		else if ( value && typeof value === 'object' ) {
			computed[ key ] = {} ;	// Don't share with eventData
			this.recursiveCompute( value , computed[ key ] , baseValue ) ;
		}

		//console.warn( "!!!!!!!!!!!!!!!!! k/v/V" , key , value , computed[ key ] ) ;
	}
} ;

