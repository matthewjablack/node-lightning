import { Network, PrivateKey, Value } from "@node-lightning/bitcoin";
import { ChannelId } from "../domain/ChannelId";
import { ChannelSide } from "./ChannelSide";
import { CommitmentNumber } from "./CommitmentNumber";
import { CommitmentSecret } from "./CommitmentSecret";
import { StateMachine } from "./StateMachine";

export class Channel {
    public temporaryId: Buffer;
    public channelId: ChannelId;
    public isPublic: boolean;

    public feeRatePerKw: Value;
    public fundingAmount: Value;
    public pushAmount: Value;

    private _fundingKey: PrivateKey;
    private _paymentBasePointSecret: PrivateKey;
    private _delayedBasePointSecret: PrivateKey;
    private _revocationBasePointSecret: PrivateKey;
    private _htlcBasePointSecret: PrivateKey;

    public get fundingKey(): PrivateKey {
        return this._fundingKey;
    }

    public set fundingKey(value: PrivateKey) {
        this._fundingKey = value;
        this.ourSide.fundingPubKey = value.toPubKey(true);
    }

    public get paymentBasePointSecret(): PrivateKey {
        return this._paymentBasePointSecret;
    }

    public set paymentBasePointSecret(value: PrivateKey) {
        this._paymentBasePointSecret = value;
        this.ourSide.paymentBasePoint = value.toPubKey(true);
    }

    public get delayedBasePointSecret(): PrivateKey {
        return this._delayedBasePointSecret;
    }

    public set delayedBasePointSecret(value: PrivateKey) {
        this._delayedBasePointSecret = value;
        this.ourSide.delayedBasePoint = value.toPubKey(true);
    }

    public get revocationBasePointSecret(): PrivateKey {
        return this._revocationBasePointSecret;
    }

    public set revocationBasePointSecret(value: PrivateKey) {
        this._revocationBasePointSecret = value;
        this.ourSide.revocationBasePoint = value.toPubKey(true);
    }

    public get htlcBasePointSecret(): PrivateKey {
        return this._htlcBasePointSecret;
    }

    public set htlcBasePointSecret(value: PrivateKey) {
        this._htlcBasePointSecret = value;
        this.ourSide.htlcBasePoint = value.toPubKey(true);
    }

    public perCommitmentSeed: Buffer;

    public ourSide: ChannelSide;
    public theirSide: ChannelSide;

    public state: StateMachine;

    constructor(readonly peerId: string, readonly network: Network, readonly funder: boolean) {
        this.ourSide = new ChannelSide();
        this.theirSide = new ChannelSide();
    }

    public getPerCommitmentSecret(commitmentNumber: CommitmentNumber): PrivateKey {
        return new PrivateKey(
            CommitmentSecret.derive(this.perCommitmentSeed, commitmentNumber.secretIndex),
            this.network,
        );
    }
}
