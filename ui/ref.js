
export class Ref {
	next= null;
	object=null;
	field=null;
	set( value ) {
		this.next = this.object[this.field];
		this.object[this.field] = value;
	}

}
