import { firestore, storage } from "@/services/firebase";
import axios from "axios";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { treeType } from "@/constants/tree-type";
import { treeSpecies } from "@/constants/tree-species";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { Signer, ethers } from "ethers";
import { getContractAddress } from "ethers/lib/utils";
import TreeToken from "@/artifacts/contracts/TreeNFT.sol/TreeToken.json";
import { contract } from "@/services/transactweb3";
import { treeContractAddress } from "@/constants/contract-address";
import Head from "next/head";

export default function TreeForm() {
  const { register, handleSubmit, reset } = useForm();
  const [trees, setTrees] = useState([]);
  const [balance, setBalance] = useState();

  const router = useRouter();

  useEffect(() => {
    if (!window.ethereum) alert("Install Metamask") && router.push("/");

    connectToWallet();
  }, []);

  const connectToWallet = async () => {
    const [account] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    console.log(provider);
    const balance = await provider.getBalance(account);
    setBalance(ethers.utils.formatEther(balance));
  };

  const getTrees = async () => {
    const treesRef = await getDocs(collection(firestore, "Trees"));

    const treesData = [];

    treesRef.forEach((snapshot) => {
      treesData.push(snapshot.data());
    });

    console.log(treesData);
    setTrees(treesData);
  };

  const handleFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

    const response = await axios.post(url, formData, {
      maxContentLength: "Infinity",
      headers: {
        "Content-Type": `multipart/form-data;boundary=${formData._boundary}`,
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET,
      },
    });

    console.log(response);

    return response.data.IpfsHash;
  };

  const onSubmit = async (data) => {
    const { images, ...rest } = data;
    const image = images[0];

    // Push to IPFS
    const ipfsHash = await handleFile(image);
    console.log(ipfsHash);

    // Mint token
    // const provider = new ethers.providers.Web3Provider(window.ethereum);
    // const signer = provider.getSigner();
    // const contract = new ethers.Contract(
    //   treeContractAddress,
    //   TreeToken.abi,
    //   signer
    // );
    // const connection = contract.connect(signer);
    // const addr = connection.address;
    // const res = await contract.mint(addr, metadataURI);

    // await res.wait();
    // console.log(await contract.isContentOwned(metadataURI));

    // Add to Firebase

    const treeRef = await addDoc(collection(firestore, "Trees"), {
      ...rest,
      ipfsHash,
    });

    console.log(treeRef.id);

    const storageRef = ref(storage, `/planted/${treeRef.id}`);

    const uploadTask = uploadBytesResumable(storageRef, image);

    uploadTask.on(
      "state_changed",
      (snapshot) => {},
      (err) => console.log(err),
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then(async (url) => {
            console.log(url);
            await updateDoc(doc(firestore, "Trees", treeRef.id), {
              imageUrl: url,
            });
            alert("Added Tree");
          })
          .catch((err) => console.error(err));
      }
    );

    // reset();
    // alert("Added Tree");
  };

  return (
    <>
    <Head>
        <title>Add Trees</title>
    </Head>
    <div className="container py-8 mx-auto">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-lg p-6 mx-auto bg-white rounded-lg shadow-md"
      >
        <div className="mb-6">
          <label htmlFor="name" className="block mb-2 font-bold text-gray-700">
            Tree Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
            {...register("name")}
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="description"
            className="block mb-2 font-bold text-gray-700"
          >
            Tree Description
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
            {...register("description")}
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="type" className="block mb-2 font-bold text-gray-700">
            Tree Type
          </label>
          <select
            type="text"
            name="type"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
            {...register("type")}
            required
          >
            {treeType.map((value) => (
              <option value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label
            htmlFor="species"
            className="block mb-2 font-bold text-gray-700"
          >
            Tree species
          </label>
          <select
            type="text"
            name="species"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
            {...register("species")}
            required
          >
            {treeSpecies.map((value) => (
              <option value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label
            htmlFor="location"
            className="block mb-2 font-bold text-gray-700"
          >
            Location
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
            {...register("location")}
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="images"
            className="block mb-2 font-bold text-gray-700"
          >
            Image
          </label>
          <input
            type="file"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
            {...register("images")}
          />
        </div>

        <div className="flex items-center justify-center mt-6">
          <button
            type="submit"
            className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-700 focus:outline-none focus:shadow-outline"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
    </>
  );
}