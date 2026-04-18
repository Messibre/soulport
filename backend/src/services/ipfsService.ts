import { config } from "../config.js";
import type { SbtMetadata } from "../types.js";

export class IpfsService {
  constructor(private readonly pinataJwt = config.pinataJwt) {}

  async uploadJsonMetadata(metadata: SbtMetadata): Promise<string> {
    if (!this.pinataJwt) {
      throw new Error("Pinata token is not configured");
    }

    const payloadSize = Buffer.byteLength(JSON.stringify(metadata), "utf8");
    if (payloadSize > 32_768) {
      throw new Error("Metadata payload is too large");
    }

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        signal: AbortSignal.timeout(config.externalApiTimeoutMs),
        headers: {
          Authorization: `Bearer ${this.pinataJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataOptions: { cidVersion: 1 },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as {
      IpfsHash?: string;
      Hash?: string;
    };
    const ipfsHash = payload.IpfsHash ?? payload.Hash;

    if (!ipfsHash) {
      throw new Error("Pinata upload failed: missing IPFS hash");
    }

    await this.pinFilePermanently(ipfsHash);
    return ipfsHash;
  }

  async pinFilePermanently(ipfsHash: string): Promise<void> {
    const response = await fetch("https://api.pinata.cloud/pinning/pinByHash", {
      method: "POST",
      signal: AbortSignal.timeout(config.externalApiTimeoutMs),
      headers: {
        Authorization: `Bearer ${this.pinataJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hashToPin: ipfsHash }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Pinata pinByHash failed: ${response.status} ${errorText}`,
      );
    }
  }
}
