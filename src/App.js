import { Alchemy, Network } from 'alchemy-sdk';
import { useEffect, useState } from 'react';

import './App.css';

// Refer to the README doc for more information about using API
// keys in client-side code. You should never do this in production
// level code.
const settings = {
  apiKey: process.env.REACT_APP_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};


// In this week's lessons we used ethers.js. Here we are using the
// Alchemy SDK is an umbrella library with several different packages.
//
// You can read more about the packages here:
//   https://docs.alchemy.com/reference/alchemy-sdk-api-surface-overview#api-surface
const alchemy = new Alchemy(settings);

function App() {
  const [blockNumber, setBlockNumber] = useState();

  useEffect(() => {
    async function getBlockNumber() {
      setBlockNumber(await alchemy.core.getBlockNumber());
    }
    getBlockNumber();
  }, []);

  // more block info
  const [blockInfo, setBlockInfo] = useState();
  useEffect(() => {
    if (blockNumber == null) return;
    async function fetchBlockByNumber() {
      const info = await alchemy.core.getBlock(blockNumber);
      setBlockInfo(info);
    }
    fetchBlockByNumber();
  }, [blockNumber]);

  return <div className="App">
      <p>Block Number: <br/> <span>{blockNumber}</span></p>
      <hr></hr>
      <h3>Block Info</h3>
      {blockInfo ? (
          <ul>
              {Object.entries(blockInfo).map(([key, value]) => (
                  <li key={key}>
                      <strong>{key}:</strong>{" "}
                      {typeof value === "object"
                          ? JSON.stringify(value)
                          : value.toString()}
                  </li>
              ))}
          </ul>
      ) : (
          <p>Loading...</p>
      )}
  </div>;
}

export default App;
