import {Span} from "./span.js";
export class SpanList {
	first = null;
	last = null;
	onstop = null;
	#current = null;
	#step = null;
	add( span ) {
		if( !this.first ) {
			this.first = span;
			span.next = null;
			span.object = this;
			span.field = "first";
			this.last = span;
			return;
		} else {
			this.last.next = span;
			span.next = null;
			span.object = this.last;
			span.field = "next";
			this.last = span;
		}
	}
	reset( firstElseLast) {
		if( firstElseLast ) {
			this.#current = this.first;
			this.#step = next => next.next;
		} else {
			this.#current = this.last;
			this.#step = next => (next.field == "next")?next.object:null;
		}
		return this.#current;
	}
	next() {
		this.#current = this.#step( this.#current );
		return this.#current;
	}
	turnTo( direction, ts ){
		this.last.end = ts; 
		this.last.update();
		new Span( this, {X:this.last.X.e,Vs:this.last.Ve,A:this.last.A,As:this.last.Ae, direction:direction, start:ts } );		
	}
	accelerate( A, ts ){
		// local timestamp
		if( this.last.A != A ) {
			this.last.end = ts; this.last.update();
			console.log( "Set accel:", A, this.last.Ve);
			new Span( this, {X:this.last.X.e,Vs:this.last.Ve,A:A,As:0, direction:this.last.direction, start:ts } );		
		} else{
			//this.last.end = ts; this.last.update();
			// repeat key does this...
			//console.log( "Segment is still accelerating...", this.last.Ve, this.last.Ae);
		}
	}
	decelerate( A, ts ){
		if( this.last.A != -A ) {
			this.last.end = ts; this.last.update();
			new Span( this, {X:this.last.X.e,Vs:this.last.Ve,A:-A,As:0, direction:this.last.direction, start:ts } );		
	} else{
		//this.last.end = ts; this.last.update();
		console.log( "Segment is still decelerating...");
	}
}
	cruise( ts ){
		if( this.last.A ) {
			this.last.end = ts; this.last.update();
			console.log( "Cruise...", this.last.Ve, this.last.Ae );
			new Span( this, {X:this.last.X.e,Vs:this.last.Ve,A:0,As:0, direction:this.last.direction, start:ts } );		
		} else console.log( "Segment is still cruising...", this.last.X.e);
	}
	tick( ts ) {
		const last = this.last;
		last.end = ts;
		last.update();
		console.log( "Tick update:", last.e, last.Ae, last.Ve);
	}
}
