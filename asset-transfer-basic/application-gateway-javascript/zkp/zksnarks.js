const chai = require("chai");
const paillier = require("paillier-bigint");
const { encryptWithProof, verifyProof } = require("paillier-in-set-zkp");
// const { generateWitness, verify } = require("../src/paillierEncryptZkp");
const bignum = require("big-integer");
const zkSnark = require("snarkjs");
// const {
//   stringifyBigInts,
//   unstringifyBigInts,
// } = require("snarkjs/src/stringifybigint.js");
const fs = require("fs");
const crypto = require("crypto-browserify");
// const Stealth = require("stealth_eth");
const ethereum = require("ethereumjs-utils");
const coinkey = require("coinkey");
// const generateCall = require("../src/generateCall.js");
const Tx = require("ethereumjs-tx");

// Workaround to solve paillier-js bigInt.rand not found when running with yarn
let bigInt = bignum;
bigInt.rand = function (bitLength) {
  let bytes = bitLength / 8;
  let buf = Buffer.alloc(bytes);
  crypto.randomFillSync(buf);
  buf[0] = buf[0] | 128; // first bit to 1 -> to get the necessary bitLength
  return bigInt.fromArray([...buf], 256);
};

// ### Web3 Connection
const Web3 = require("web3");
const web3 = new Web3(
  new Web3.providers.WebsocketProvider("ws://localhost:8545")
);

// ### Artifacts
// const Verifier = artifacts.require("../contracts/Verifier.sol");
// const PDAV = artifacts.require("../contracts/Pdav.sol");

const assert = chai.assert;

let PdavVerifier = "";
let Pdav = "";
let PdavABI = "";
let PdavAddress = "";
let allAccounts = "";
let ethStealthAddress = "";
let pubKeyToRecover = "";
let opMarker = "";
let stealth = {};

contract("PDAV Verifier", (accounts) => {
  // Creating a collection of tests that should pass
  describe("Install contracts and test", () => {
    beforeEach(async () => {
      // Retrieve the Homomorphic Encryption Key generated on truffle migrate
      // To insert it on the SmartContract
      const publicKey = JSON.parse(
        fs.readFileSync("test/dataenc_publicKey.json", "utf8")
      );
      let _publicKey = JSON.stringify({
        n: stringifyBigInts(publicKey.n.toString()),
        g: stringifyBigInts(publicKey.g.toString()),
        _n2: stringifyBigInts(publicKey._n2.toString()),
        bitLength: publicKey.bitLength,
      });

      PdavVerifier = await Verifier.new(accounts[0]);
      verifierAddress = await PdavVerifier.address;
      Pdav = await PDAV.new(
        web3.utils.toHex("ballot0001"),
        web3.utils.toHex(_publicKey),
        verifierAddress
      );
      PdavABI = await Pdav.abi;
      PdavAddress = await Pdav.address;
      allAccounts = accounts;
    });

    it("Test Pdav contract", async () => {
      result = await Pdav.ballotIdentifier().then(function (res) {
        return res;
      });
      assert.equal(
        "0x62616c6c6f743030303100000000000000000000000000000000000000000000",
        result.toString()
      );
    });

    it("Verify zk data proof on smartcontract", async () => {
      let proof = JSON.parse(
        fs.readFileSync("./test/circuit/test_trusted_setup/proof.json", "utf8")
      );
      let publicSignals = JSON.parse(
        fs.readFileSync("./test/circuit/test_trusted_setup/public.json", "utf8")
      );

      // generateCall is a fork of snarkjs cli and modified to get the proof to be sent to the smart-contract
      let verifyCall = await generateCall(publicSignals, proof);
      result = await PdavVerifier.verifyProof.call(
        verifyCall.a,
        verifyCall.ap,
        verifyCall.b,
        verifyCall.bp,
        verifyCall.c,
        verifyCall.cp,
        verifyCall.h,
        verifyCall.kp,
        verifyCall.inputs
      );
      assert.isTrue(result);
    });
  });
});

describe("Create and test an ethereum stealth wallet", () => {
  let compressedPubScanKeys = "";

  it("Agent create scan keys, encode pub+scan public and send to Data Admin", () => {
    // Optionally generate two key pairs, can use CoinKey, bitcoinjs-lib, bitcore, etc
    // let payloadKeyPair = coinkey.createRandom()
    // let scanKeyPair = coinkey.createRandom()
    // and use it to fill the stealth object

    stealth = new Stealth({
      payloadPrivKey: new Buffer(
        "3ee7c0e1d4cbd9c1fe34aef5e910b23fffe2d0bd1d7f2dd51f567078100fe3d1",
        "hex"
      ),
      payloadPubKey: new Buffer(
        "026fa340f85b9a0c3a0d75898ef25064ec569c57d1e8922ceb67ec08e9907adfb2",
        "hex"
      ),
      scanPrivKey: new Buffer(
        "1ce88522ea4c6927d53799191a6201806d4dce62db69aadd63603cba8d2d8c9f",
        "hex"
      ),
      scanPubKey: new Buffer(
        "032caa1a564f7f7e17ca5424d4f17495a8568600add7fc1587198d151bddc23e84",
        "hex"
      ),
    });

    compressedPubScanKeys = stealth.toString();
    assert.equal(
      compressedPubScanKeys,
      "vJmwnas6bWjz6kerJ1SU52LYxf48GZBdR3tn8haF9pj3dAHqYNsGCgW64WF4k1a1RoNYTko62rsuu4wFbydisaaXCoF7SAtYEqwS2E"
    );
  }).timeout(10000000);

  it("Organiser receives compressedPubScanKeys from agent, creates a random stealth wallet and send to smart-contract", async () => {
    let recoveryFromCompressed = Stealth.fromString(compressedPubScanKeys);

    // single-use nonce key pair, works with CoinKey, bitcoinjs-lib, bitcore, etc
    let keypair = coinkey.createRandom();

    // generate payment address
    ethStealthAddress = ethereum.addHexPrefix(
      recoveryFromCompressed.genEthPaymentAddress(keypair.privateKey)
    );
    pubKeyToRecover = keypair.publicKey.toString("hex");
    opMarker = recoveryFromCompressed
      .genPaymentPubKeyHash(keypair.privateKey)
      .toString("hex");

    let canSendData = await Pdav.ephemeralAgents(ethStealthAddress);
    assert.isNotTrue(canSendData.canSendData);

    // send three outputs to a smart-contract:
    // 1. ETH address
    // 1. Regular pubKeyToRecover
    // 2. Marker with `opMarker`
    await Pdav.addEphemeralAgent(
      ethStealthAddress,
      web3.utils.toHex(pubKeyToRecover),
      web3.utils.toHex(opMarker)
    ).then(async () => {
      // Must funding ephemeral wallet to enable voting. Could be made by smart-contract too.
      let tx = await web3.eth.sendTransaction({
        from: allAccounts[0],
        to: ethStealthAddress,
        value: web3.utils.toHex(web3.utils.toWei("1", "ether")),
      });
      assert.exists(tx.transactionHash);
    });

    assert.isTrue(ethereum.isValidAddress(ethStealthAddress));
  });

  it("Organiser checks if stealth wallet can send data", async () => {
    let canSendData = await Pdav.ephemeralAgentArray(
      await Pdav.ephemeralAgents(ethStealthAddress)
    );

    assert.isTrue(canSendData.canSendData);
  });

  it("Agent discovers his stealth wallet", async () => {
    let ew, opMarkerBuffer, pubKeyToRecoverBuffer, keypair;
    let ewCount = await Pdav.agentsCount();

    for (var i = 0; i < ewCount; i++) {
      ew = await Pdav.getEphemeralWallets(i);
      pubKeyToRecoverBuffer = new Buffer(web3.utils.hexToAscii(ew[1]), "hex");
      opMarkerBuffer = new Buffer(ew[2].slice(2, 42), "hex");

      keypair = stealth.checkPaymentPubKeyHash(
        pubKeyToRecoverBuffer,
        opMarkerBuffer
      );
      if (keypair != null) break;
    }

    assert.exists(keypair, "privKey");
    assert.isNotNull(keypair);
  });

  it("Agent recover private key and send a trasaction", async () => {
    let opMarkerBuffer = new Buffer(opMarker, "hex");
    let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, "hex");

    let keypair = stealth.checkPaymentPubKeyHash(
      pubKeyToRecoverBuffer,
      opMarkerBuffer
    );

    let ethAddress =
      "0x" + ethereum.privateToAddress(keypair.privKey).toString("hex");

    // Lets use the recovered private key to access the wallet and prove it can send some funds
    let privateKey = new Buffer(keypair.privKey, "hex");

    let rawTx = {
      // nonce: web3.utils.toHex(web3.eth.getTransactionCount(ethAddress)),
      nonce: "0x00",
      from: ethAddress,
      to: allAccounts[2],
      gasPrice: web3.utils.toHex(web3.utils.toWei("6", "gwei")),
      gasLimit: web3.utils.toHex("10000"),
      gas: web3.utils.toHex("50000"),
      value: web3.utils.toHex(web3.utils.toWei("0.01", "ether")),
    };

    let unsignedTx = new Tx(rawTx);
    unsignedTx.sign(privateKey);

    let serializedTx = unsignedTx.serialize();
    let tx = await web3.eth.sendSignedTransaction(
      "0x" + serializedTx.toString("hex")
    );
    //.on('receipt', console.log)

    assert.exists(tx.transactionHash);
    assert.equal(ethAddress, ethStealthAddress);
  });
});

describe("Create data and zk-snarks of data", () => {
  let data = {};

  // Setting up the data
  let agent = "0x965cd5b715904c37fcebdcb912c672230103adef";
  let signature =
    "0x234587623459623459782346592346759234856723985762398756324985762349587623459876234578965978234659823469324876324978632457892364879234697853467896";

  data.aggregatorA = [0, 0, 1, 0];
  data.aggregatorB = [1, 0];
  data.aggregatorC = [0, 0, 0, 1];

  let count_data = 0;
  let ptv = 0;
  let stv = 0;
  let sgtv = 0;

  for (let i = 0; i < data.aggregatorA.length; i++) {
    if (data.aggregatorA[i] == 1) {
      ptv += 1;
      count_data += 1;
    }
  }

  for (let j = 0; j < data.aggregatorB.length; j++) {
    if (data.aggregatorB[j] == 1) {
      stv += 1;
      count_data += 1;
    }
  }

  for (let k = 0; k < data.aggregatorC.length; k++) {
    if (data.aggregatorC[k] == 1) {
      sgtv += 1;
      count_data += 1;
    }
  }

  // Would create and use sha256 of data
  // let dataSha256 = crypto.createHash('sha256').update(JSON.stringify(data).toString()).digest('hex');

  let aggregatorATotalCandidates = data.aggregatorA.length;
  let aggregatorBTotalCandidates = data.aggregatorB.length;
  let aggregatorCTotalCandidades = data.aggregatorC.length;

  let p = 1234;
  let rcm = [1234, 13134];

  // Input Array to zk-proof circuit
  const inputArray = {
    agent: agent.toString(),
    signature: signature.toString(),
    aggregatorA: data.aggregatorA,
    aggregatorB: data.aggregatorB,
    aggregatorC: data.aggregatorC,
    p: p,
    rcm: rcm,
    aggregatorATotalCandidates: aggregatorATotalCandidates,
    aggregatorBTotalCandidates: aggregatorBTotalCandidates,
    aggregatorCTotalCandidates: aggregatorCTotalCandidades,
    aggregatorATotalData: ptv,
    aggregatorBTotalData: stv,
    aggregatorCTotalData: sgtv,
    totalData: count_data,
  };

  let circuit = {};
  let setup = {};
  let witness = {};
  let proof = {};
  let publicKey = {};
  let privateKey = {};

  it("Load a circuit", () => {
    // Circuit preparing
    const circuitDef = JSON.parse(
      fs.readFileSync("zksnarks/circuits/data-proof1.json", "utf8")
    );
    circuit = new zkSnark.Circuit(circuitDef);
    assert.equal(circuit.nOutputs, 4);
  });

  it("Create a trusted setup", () => {
    // Trusted setup
    setup = zkSnark.original.setup(circuit);
    setup.toxic; // Must be discarded.
    assert.equal(setup.vk_verifier.nPublic, 7);
  }).timeout(10000000);

  it("Generate witness", () => {
    // Generate Witness
    witness = circuit.calculateWitness(inputArray);
    assert.equal(
      witness.toString(),
      "1,1,1,1,3,4,2,4,1,1,1,3,0,0,1,0,1,0,0,0,0,1,858418901399080381986333839137122232297777769967,34077102564424341946805774145332421253459555611827306095970056431371046409817239864580385688030092546598700163424794358633725950204037731083721568214179166939530124130154646,1234,1234,13134,0,1,0,1,0,1,0,0,0"
    );
  });

  it("Generate proof-of-data", () => {
    const vk_proof = setup.vk_proof;
    // Generate the proof
    proof = zkSnark.original.genProof(vk_proof, witness);
    assert.equal(proof.proof.protocol, "original");
  });

  it("Verify proof-of-data", () => {
    // Verify the proof
    const vk_verifier = setup.vk_verifier;
    assert.isTrue(
      zkSnark.original.isValid(vk_verifier, proof.proof, proof.publicSignals)
    );
  }).timeout(10000000);

  it("Verify proof of encryption", () => {
    const _publicKey = JSON.parse(
      fs.readFileSync("test/dataenc_publicKey.json", "utf8")
    );
    g = bignum(_publicKey.g);
    N = bignum(_publicKey.n);
    c = bignum(
      g
        .pow(1)
        .multiply(bignum(2).modPow(N, N.pow(2)))
        .mod(N.pow(2))
    );
    u = bignum(
      g
        .pow(3)
        .multiply(bignum(2).modPow(N, N.pow(2)))
        .mod(N.pow(2))
    );

    const [v, w] = generateWitness(3, 2, 2, 2, 1, N);

    res = verify(g, c, w, v, 2, N, u);
    assert(res == "OK");
  });
  it("Register proof of data in blockchain", async () => {
    let web3 = new Web3(
      new Web3.providers.WebsocketProvider("ws://localhost:8545")
    );
    const contract = new web3.eth.Contract(PdavABI, PdavAddress);

    let proof = JSON.parse(
      fs.readFileSync("./test/circuit/test_trusted_setup/proof.json", "utf8")
    );
    let publicSignals = JSON.parse(
      fs.readFileSync("./test/circuit/test_trusted_setup/public.json", "utf8")
    );

    // generateCall is a fork of snarkjs cli and modified to get the proof to be sent to the smart-contract
    let verifyCall = await generateCall(publicSignals, proof);
    res = await contract.methods.registerDataProof(
      verifyCall.a,
      verifyCall.ap,
      verifyCall.b,
      verifyCall.bp,
      verifyCall.c,
      verifyCall.cp,
      verifyCall.h,
      verifyCall.kp,
      verifyCall.inputs
    );
  });
});



describe("Encrypt, count, decrypt and test result proof", () => {
  let data = {};

  // Setting up the data
  let agent = "0x965cd5b715904c37fcebdcb912c672230103adef";
  let signature =
    "0x234587623459623459782346592346759234856723985762398756324985762349587623459876234578965978234659823469324876324978632457892364879234697853467896";

  data.aggregatorA = [0, 0, 1, 0];
  data.aggregatorB = [1, 0];
  data.aggregatorC = [0, 0, 0, 1];

  let dataCount = 0;
  let dataArray = [];

  // Optional: Randomly creates the Homomorphic Crypto Keys
  //const { publicKey, privateKey } = paillier.generateRandomKeys(1024);
  let publicKey = "";
  let privateKey = "";

  it("Encrypt data", async () => {
    // Optional: Retrieve Homomorphic Encryption Keys generated on Truffle Migrate
    // const _publicKey = JSON.parse(fs.readFileSync("test/dataenc_publicKey.json", "utf8"));
    // const publicKey = new paillier.PublicKey(BigInt(_publicKey.n), BigInt(_publicKey.g));

    // Retrieve Homomorphic Encryption Key from smart-contract
    let result = await Pdav.encryptionPublicKey().then(function (res) {
      return web3.utils.hexToAscii(res);
    });
    const _publicKey = JSON.parse(result);
    publicKey = new paillier.PublicKey(
      BigInt(_publicKey.n),
      BigInt(_publicKey.g)
    );
    assert(publicKey.bitLength == "1024");

    for (let i = 0; i < data.aggregatorA.length; i++) {
      dataCount += data.aggregatorA[i];
      // convert data to bignum
      //let bn1 = BigInt(data.aggregatorA[i]).mod(publicKey.n);
      let bn1 = BigInt(data.aggregatorA[i]);
      bn1 = bn1.mod(publicKey.n);
      while (bn1.lt(0)) bn1 = bn1.add(publicKey.n); // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
      // encrypt the data with published pk
      paillier.PublicKey.apply;
      data.aggregatorA[i] = publicKey.encrypt(data.aggregatorA[i]);
    }

    for (let j = 0; j < data.aggregatorB.length; j++) {
      dataCount += data.aggregatorB[j];
      // convert data to bignum
      let bn2 = BigInt(data.aggregatorB[j]).mod(publicKey.n);
      while (bn2.lt(0)) bn2 = bn2.add(publicKey.n); // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
      // encrypt the data with published pk
      data.aggregatorB[j] = publicKey.encrypt(data.aggregatorB[j]);
    }

    for (let k = 0; k < data.aggregatorC.length; k++) {
      dataCount += data.aggregatorC[k];
      // convert data to bignum
      let bn3 = BigInt(data.aggregatorC[k]).mod(publicKey.n);
      while (bn3.lt(0)) bn3 = bn3.add(publicKey.n); // bug in bignum? mod(n) of negative number returns .abs().mod(n). This should fix it
      // encrypt the data with published pk
      data.aggregatorC[k] = publicKey.encrypt(data.aggregatorC[k]);
    }
    assert(data.aggregatorA[0].mod(data.aggregatorA[0]).toString() == "0"); // must be bignumber to .mod()
  });

  it("Register encrypted data on blockchain through ephemeral wallet", async () => {
    // Must reopen conection that was closed (!)
    let web3 = new Web3(
      new Web3.providers.WebsocketProvider("ws://localhost:8545")
    );

    // Getting access to Ephemeral Wallet

    let opMarkerBuffer = new Buffer(opMarker, "hex");
    let pubKeyToRecoverBuffer = new Buffer(pubKeyToRecover, "hex");

    let keypair = stealth.checkPaymentPubKeyHash(
      pubKeyToRecoverBuffer,
      opMarkerBuffer
    );

    let ethAddress =
      "0x" + ethereum.privateToAddress(keypair.privKey).toString("hex");

    let canSendData = await Pdav.ephemeralAgentArray(
      await Pdav.ephemeralAgents(ethAddress)
    );
    assert.isTrue(canSendData.canSendData);

    // Lets use the recovered private key to access the wallet and prove it can send some funds
    let privateKey = new Buffer(keypair.privKey, "hex");

    // Transforming all data to hex format web3.utils.toHex(data.aggregatorA[0].toString())
    // Could be transformed back using BigInt(web3.utils.hexToAscii(hexData))
    // Test: data.aggregatorA[0].toString() === web3.utils.toBN(web3.utils.hexToAscii(hexPres)).toString()
    // Result: true

    let hexData = {};
    hexData.aggregatorA = [];
    hexData.aggregatorB = [];
    hexData.aggregatorC = [];

    for (let i = 0; i < data.aggregatorA.length; i++) {
      hexData.aggregatorA[i] = web3.utils.toHex(data.aggregatorA[i].toString());
    }

    for (let j = 0; j < data.aggregatorB.length; j++) {
      hexData.aggregatorB[j] = web3.utils.toHex(data.aggregatorB[j].toString());
    }

    for (let k = 0; k < data.aggregatorC.length; k++) {
      hexData.aggregatorC[k] = web3.utils.toHex(data.aggregatorC[k].toString());
    }

    const contract = new web3.eth.Contract(PdavABI, PdavAddress);
    const method = contract.methods.addData(
      hexData.aggregatorA,
      hexData.aggregatorB,
      hexData.aggregatorC,
      web3.utils.toHex("commit1")
    );
    const encodedABI = method.encodeABI();

    // 2 ways for estimating gas
    const estimateGas1 = await Pdav.addData.estimateGas(
      hexData.aggregatorA,
      hexData.aggregatorB,
      hexData.aggregatorC,
      web3.utils.toHex("commit1"),
      { from: ethAddress }
    );
    const estimateGas2 = await web3.eth.estimateGas({
      from: ethAddress,
      to: PdavAddress,
      data: encodedABI,
    });
    assert.equal(estimateGas1, estimateGas2);

    let rawTx = {
      //nonce: web3.utils.toHex(web3.eth.getTransactionCount(ethAddress)),
      nonce: "0x01",
      from: ethAddress,
      to: PdavAddress,
      gasPrice: web3.utils.toHex(web3.utils.toWei("6", "gwei")),
      gasLimit: web3.utils.toHex("10000"),
      gas: estimateGas1,
      data: encodedABI,
    };

    let unsignedTx = new Tx(rawTx);
    unsignedTx.sign(privateKey);

    let serializedTx = unsignedTx.serialize();

    let tx = await web3.eth.sendSignedTransaction(
      "0x" + serializedTx.toString("hex")
    );

    canSendData = await Pdav.ephemeralAgentArray(
      await Pdav.ephemeralAgents(ethAddress)
    );
    assert.isNotTrue(canSendData.canSendData);
    assert.isTrue(canSendData.sent);
  }).timeout(10000000);

  it("Recovering data from blockchain and sum all together", async () => {
    let encryptedData = [{}];
    let bDataArray = [];
    encryptedData.aggregatorA = [];
    encryptedData.aggregatorB = [];
    encryptedData.aggregatorC = [];

    // Get total data
    let dataCount = await Pdav.dataCount();

    // Retrieve Homomorphic Private Key from local storage
    const _privateKey = JSON.parse(
      fs.readFileSync("test/dataenc_privateKey.json", "utf8")
    );
    privateKey = new paillier.PrivateKey(
      BigInt(_privateKey.lambda),
      BigInt(_privateKey.mu),
      new paillier.PublicKey(
        BigInt(_privateKey.publicKey.n),
        BigInt(_privateKey.publicKey.g)
      ),
      BigInt(_privateKey._p),
      BigInt(_privateKey._q)
    );

    let encryptedTotalSum = 0n;
    let encryptedaggregatorASum = [],
      encryptedaggregatorBSum = [],
      encryptedaggregatorCSum = [];
    let bn5 = BigInt(encryptedTotalSum).mod(publicKey.n);
    while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
    encryptedTotalSum = publicKey.encrypt(encryptedTotalSum);

    for (var i = 0; i < dataCount; i++) {
      bDataArray = await Pdav.getData(i);
      encryptedData[i].aggregatorA = bDataArray[0];
      encryptedData[i].aggregatorB = bDataArray[1];
      encryptedData[i].aggregatorC = bDataArray[2];

      for (let j = 0; j < bDataArray[0].length; j++) {
        encryptedTotalSum = publicKey.addition(
          BigInt(web3.utils.hexToAscii(encryptedData[i].aggregatorA[j])),
          encryptedTotalSum
        );
        if (encryptedaggregatorASum[j] == null) {
          encryptedaggregatorASum[j] = 0;
          let bn5 = BigInt(encryptedaggregatorASum[j]).mod(publicKey.n);
          while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
          encryptedaggregatorASum[j] = publicKey.encrypt(
            encryptedaggregatorASum[j]
          );
        }
        encryptedaggregatorASum[j] = publicKey.addition(
          BigInt(web3.utils.hexToAscii(encryptedData[i].aggregatorA[j])),
          encryptedaggregatorASum[j]
        );
      }

      for (let k = 0; k < bDataArray[1].length; k++) {
        if (encryptedaggregatorBSum[k] == null) {
          encryptedaggregatorBSum[k] = 0;
          let bn5 = BigInt(encryptedaggregatorBSum[k]).mod(publicKey.n);
          while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
          encryptedaggregatorBSum[k] = publicKey.encrypt(
            encryptedaggregatorBSum[k]
          );
        }
        encryptedTotalSum = publicKey.addition(
          BigInt(web3.utils.hexToAscii(encryptedData[i].aggregatorB[k])),
          encryptedTotalSum
        );
        encryptedaggregatorBSum[k] = publicKey.addition(
          BigInt(web3.utils.hexToAscii(encryptedData[i].aggregatorB[k])),
          encryptedaggregatorBSum[k]
        );
      }

      for (let l = 0; l < bDataArray[2].length; l++) {
        if (encryptedaggregatorCSum[l] == null) {
          encryptedaggregatorCSum[l] = 0;
          let bn5 = BigInt(encryptedaggregatorCSum[l]).mod(publicKey.n);
          while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
          encryptedaggregatorCSum[l] = publicKey.encrypt(
            encryptedaggregatorCSum[l]
          );
        }
        encryptedTotalSum = publicKey.addition(
          BigInt(web3.utils.hexToAscii(encryptedData[i].aggregatorC[l])),
          encryptedTotalSum
        );
        encryptedaggregatorCSum[l] = publicKey.addition(
          BigInt(web3.utils.hexToAscii(encryptedData[i].aggregatorC[l])),
          encryptedaggregatorCSum[l]
        );
      }
    }
    // Decrypt the encrypted sum of data
    let decryptedTotalSum = BigInt(
      privateKey.decrypt(BigInt(encryptedTotalSum))
    );

    let decryptedaggregatorASum = [];
    let decryptedaggregatorBSum = [];
    let decryptedaggregatorCSum = [];

    // Decrypt all the data
    for (let i = 0; i < encryptedaggregatorASum.length; i++) {
      decryptedaggregatorASum.push(
        privateKey.decrypt(encryptedaggregatorASum[i])
      );
    }

    for (let i = 0; i < encryptedaggregatorBSum.length; i++) {
      decryptedaggregatorBSum.push(
        privateKey.decrypt(encryptedaggregatorBSum[i])
      );
    }

    for (let i = 0; i < encryptedaggregatorCSum.length; i++) {
      decryptedaggregatorCSum.push(
        privateKey.decrypt(encryptedaggregatorCSum[i])
      );
    }

    assert(decryptedTotalSum.toString() == 3);
    assert(decryptedaggregatorASum[2].toString() == 1);
  });

  it("Testing sum on encrypted data straight from memory", () => {
    // Retrieve Homomorphic Private Key from local storage
    const _privateKey = JSON.parse(
      fs.readFileSync("test/dataenc_privateKey.json", "utf8")
    );
    privateKey = new paillier.PrivateKey(
      BigInt(_privateKey.lambda),
      BigInt(_privateKey.mu),
      new paillier.PublicKey(
        BigInt(_privateKey.publicKey.n),
        BigInt(_privateKey.publicKey.g)
      ),
      BigInt(_privateKey._p),
      BigInt(_privateKey._q)
    );

    let encryptedSum = 0n;
    let bn5 = BigInt(encryptedSum).mod(publicKey.n);
    while (bn5.lt(0)) bn5 = bn5.add(publicKey.n);
    encryptedSum = publicKey.encrypt(encryptedSum);

    for (let i = 0; i < data.aggregatorA.length; i++) {
      encryptedSum = publicKey.addition(data.aggregatorA[i], encryptedSum);
      dataArray.push(data.aggregatorA[i]);
    }

    for (let j = 0; j < data.aggregatorB.length; j++) {
      encryptedSum = publicKey.addition(data.aggregatorB[j], encryptedSum);
      dataArray.push(data.aggregatorB[j]);
    }

    for (let k = 0; k < data.aggregatorC.length; k++) {
      encryptedSum = publicKey.addition(data.aggregatorC[k], encryptedSum);
      dataArray.push(data.aggregatorC[k]);
    }
    let decryptedSum = privateKey.decrypt(encryptedSum);
    assert(decryptedSum.toString() == dataCount.toString());
  });

  it("Create a proof-of-result, and test result", () => {
    // Creates a proof of result, encrypting with public key recovered on the smart-contract
    // Public key is used for testing and verifying the result
    // Decrypts using private key recovered from storage

    const [encrypted, proof] = encryptWithProof(
      publicKey,
      dataCount,
      [dataCount],
      publicKey.bitLength
    );
    const result = verifyProof(
      publicKey,
      encrypted,
      proof,
      [dataCount],
      publicKey.bitLength
    ); // true
    //console.log(encrypted);
    //console.log(encrypted.toString());
    let decrypted = privateKey.decrypt(BigInt(encrypted.toString()));

    assert(result == true && decrypted == dataCount);
  }).timeout(10000000);
});
