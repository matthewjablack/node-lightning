import { BufferWriter } from "@node-lightning/bufio";
import { AddressType } from "./AddressType";
import { Base58Check } from "./Base58Check";
import { Bech32, Bech32Version } from "./Bech32";
import { BitcoinError } from "./BitcoinError";
import { BitcoinErrorCode } from "./BitcoinErrorCode";
import { Network } from "./Network";

/**
 * Address encoding/decoding utility for legacy and segwit addresses.
 */
export class Address {
    /**
     * Convenient helper method that attempts to decode any address.
     *
     * @param address
     */
    public static fromStr(address: string): { type: AddressType; network: Network; hash: Buffer } {
        const bech32Prefixes: string[] = [];
        for (const network of Network.all) {
            bech32Prefixes.push(network.p2wpkhPrefix);
            bech32Prefixes.push(network.p2wpkhPrefix.toUpperCase());
            bech32Prefixes.push(network.p2wshPrefix);
            bech32Prefixes.push(network.p2wshPrefix.toUpperCase());
        }

        // try bech32 first by checking if it starts with an hrp prefix
        for (const bech32Prefix of bech32Prefixes) {
            if (address.startsWith(bech32Prefix)) {
                const result = this.decodeBech32(address);
                return { type: result.type, network: result.network, hash: result.program };
            }
        }

        // otherwise try base58
        return this.decodeBase58(address);
    }

    /**
     * Encodes a P2PKH or P2SH address using Base58Check in the format
     * - 1-byte: prefix
     * - 20-byte: hash160 of data
     * - 4-byte: checksum from hash256 of data
     * @param prefix - 1-byte prefix from a Network config (either p2)
     * @param hash
     * @returns
     */
    public static encodeBase58(prefix: number, hash: Buffer): string {
        if (hash.length !== 20) {
            throw new BitcoinError(BitcoinErrorCode.Hash160Invalid, { hash });
        }
        const w = new BufferWriter(Buffer.alloc(21));
        w.writeUInt8(prefix);
        w.writeBytes(hash);
        return Base58Check.encode(w.toBuffer());
    }

    /**
     * Decodes a Base58Check encoded legacy address and determines the
     * network. This function returns the hash160 and the prefix.
     * @param encoded base58check encoded string
     * @returns
     */
    public static decodeBase58(
        encoded: string,
    ): { type: AddressType; network: Network; prefix: number; hash: Buffer } {
        const data = Base58Check.decode(encoded);
        const prefix = data[0];
        const hash = data.slice(1);
        if (hash.length !== 20) {
            throw new BitcoinError(BitcoinErrorCode.Hash160Invalid, { hash });
        }
        for (const network of Network.all) {
            if (network.p2pkhPrefix === prefix) {
                return { type: AddressType.P2pkh, network, prefix, hash };
            } else if (network.p2shPrefix === prefix) {
                return { type: AddressType.P2sh, network, prefix, hash };
            }
        }
        throw new BitcoinError(BitcoinErrorCode.UnknownAddressPrefix, { encoded });
    }

    /**
     * Encodes a native segwit P2WPKH or P2WSH address using bech32.
     * @param prefix hrp part of the address
     * @param version segwit version
     * @param program witness program
     * @returns
     */
    public static encodeBech32(prefix: string, version: number, program: Buffer): string {
        const words = [version].concat(Bech32.bufferToWords(program, true));
        return Bech32.encode(prefix, words, Bech32Version.Bech32);
    }

    /**
     * Decodes a bech32 address and returns the corresponding network,
     * segwit version, and witness program.
     * @param encoded
     * @returns
     */
    public static decodeBech32(
        encoded: string,
    ): { type: AddressType; network: Network; version: number; program: Buffer } {
        const { hrp, words, version: checksum } = Bech32.decode(encoded);
        const version = words[0];
        if (version < 0 || version > 16) {
            throw new BitcoinError(BitcoinErrorCode.InvalidSegwitVersion, { encoded, version });
        }

        if (version === 0 && checksum !== Bech32Version.Bech32) {
            throw new BitcoinError(BitcoinErrorCode.InvalidBech32Encoding);
        }

        if (version > 0 && checksum !== Bech32Version.Bech32m) {
            throw new BitcoinError(BitcoinErrorCode.InvalidBech32Encoding);
        }

        const program = Bech32.wordsToBuffer(words.slice(1), false);

        let type: AddressType;
        if (version === 0) {
            if (program.length === 20) type = AddressType.P2wpkh;
            if (program.length === 32) type = AddressType.P2wsh;
        }

        if (version === 0 && program.length !== 20 && program.length !== 32) {
            throw new BitcoinError(BitcoinErrorCode.InvalidWitnessProgram, {
                encoded,
                version,
                program,
                length: program.length,
            });
        }

        if (program.length < 2 || program.length > 40) {
            throw new BitcoinError(BitcoinErrorCode.InvalidWitnessProgram, {
                encoded,
                version,
                program,
                length: program.length,
            });
        }

        for (const network of Network.all) {
            if (hrp === network.p2wpkhPrefix) return { type, network, version, program };
        }

        throw new BitcoinError(BitcoinErrorCode.UnknownAddressPrefix, { encoded, hrp });
    }
}
