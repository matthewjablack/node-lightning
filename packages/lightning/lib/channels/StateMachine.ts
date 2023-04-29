/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { ILogger } from "@node-lightning/logger";

import { Channel } from "./Channel";
import { ChannelEvent } from "./ChannelEvent";
import { ChannelEventType } from "./ChannelEventType";
import { IStateMachine } from "./IStateMachine";
import { TransitionFn } from "./TransitionFn";
import { TransitionResult } from "./TransitionResult";

export class StateMachine implements IStateMachine {
    public logger: ILogger;

    public parent: IStateMachine | undefined;
    public subStates: Map<string, IStateMachine> = new Map();
    public transitions: Map<ChannelEventType, TransitionFn> = new Map();
    public enterFn: TransitionFn;
    public exitFn: TransitionFn;

    public get stack(): IStateMachine[] {
        const result: IStateMachine[] = [];
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current: IStateMachine = this;
        while (current !== undefined) {
            result.push(current);
            current = current.parent;
        }
        return result.reverse();
    }

    public get id(): string {
        if (this.parent) {
            return this.parent.id + "." + this.name;
        }
        return this.name;
    }

    public constructor(logger: ILogger, readonly name: string) {
        this.logger = logger.sub(StateMachine.name);
    }

    public addSubState(state: IStateMachine): this {
        state.parent = this;
        this.subStates.set(state.id, state);
        return this;
    }

    public addTransition(type: ChannelEventType, fn: TransitionFn): this {
        this.transitions.set(type, fn);
        return this;
    }

    public setEnterFn(fn: TransitionFn): this {
        this.enterFn = fn;
        return this;
    }

    public setExitFn(fn: TransitionFn): this {
        this.exitFn = fn;
        return this;
    }

    public async onEnter(channel: Channel, event: ChannelEvent): Promise<TransitionResult> {
        this.logger.debug("Entering", this.name);
        return this.enterFn ? this.enterFn(channel, event) : undefined;
    }

    public async onExit(channel: Channel, event: ChannelEvent): Promise<TransitionResult> {
        this.logger.debug("Exiting", this.name);
        return this.exitFn ? this.exitFn(channel, event) : undefined;
    }

    public async onEvent(channel: Channel, event: ChannelEvent): Promise<TransitionResult> {
        if (!this.transitions.has(event.type)) return;
        return this.transitions.get(event.type)(channel, event);
    }
}
