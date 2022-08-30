export interface ModelEmitter {
	on(eventName: string, listener: (...args: any[]) => void): () => void,
	off(eventName: string, listener: (...args: any[]) => void): void,
	emit(eventName: string, ...args: any[]): void,
}
