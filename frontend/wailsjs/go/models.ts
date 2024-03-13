export namespace main {
	
	export class AIResponse {
	    commands: string[];
	    errors: string[];
	    messages: string[];
	    results: string[];
	    isError: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AIResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commands = source["commands"];
	        this.errors = source["errors"];
	        this.messages = source["messages"];
	        this.results = source["results"];
	        this.isError = source["isError"];
	    }
	}

}

