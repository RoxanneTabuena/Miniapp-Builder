import Block from './Block'
import { BlockModel } from './types'
import BlockFactory from './BlockFactory';
import './BlockStyles.css'
import { Box, Button, Checkbox, DialogContent, FormControlLabel, FormGroup, TextField } from '@mui/material';
import { NFTE } from '@nfte/react';
import { getNFTMetadata } from './utils/AlchemyAPI';
import { useEffect, useState } from 'react';
import { Nft } from 'alchemy-sdk'
import './BlockStyles.css'
import { Theme, ToggleButton, ToggleButtonGroup } from '@mui/material';

interface NftCardProps {
  tokenAddress: string;
  tokenId: string;
  theme: Theme
}

function NFTCard(props: NftCardProps) {
  const [asset, setAsset] = useState<Nft>();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadNFT = async (
      tokenAddress: NftCardProps['tokenAddress'],
    ) => {
      setIsLoading(true);
      setLoadingError(undefined);

      const nft = await getNFTMetadata(tokenAddress, props.tokenId);
      setIsLoading(false);
      setAsset(nft);
    }

    loadNFT(props.tokenAddress);
  }, [props.tokenAddress, props.tokenId]);

  let primaryColor = props.theme.palette.primary.main
  let secondaryColor = props.theme.palette.secondary.main
  let teritaryColor = props.theme.palette.info.main

  const getImageUrl = (asset: Nft) => {
    let imageUrl = '';
    if (asset.media && asset.media[0] && asset.media[0].gateway) {
      imageUrl = asset.media[0].gateway; // Use 'gateway' property
    } else if (asset.rawMetadata && asset.rawMetadata.image) {
      imageUrl = asset.rawMetadata.image;
    } else if (asset.contract.openSea && asset.contract.openSea.imageUrl) {
      // when the original project site has shut down, sometimes opensea has a cached copy of the nft image
      imageUrl = asset.contract.openSea.imageUrl
    } else {
      console.log("unable to find")
      console.log(asset)
    }

    // Convert IPFS URL to a usable format
    if (imageUrl?.startsWith('ipfs://')) {
      imageUrl = `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
    }

    return imageUrl;
  }

  if (loadingError) {
    return (
      <div style={{ position: "relative", height: '100%', width: "100%", alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
        <div>
          {loadingError}
        </div>
        <br />
        <div>Please try again ♡</div>
      </div>
    )
  }

  const imageURL = asset ? getImageUrl(asset) : ""
  const title = asset?.title

  const containerStyle = {
    width: "100%",
    height: "100%",
  };

  return (
    <div style={containerStyle}>
      <img style={{ width: '100%', height: 'auto', marginBottom: '20px', }} src={imageURL} alt={title} />
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>{title}</div>
    </div>
  )
}

export default class NFTBlock extends Block {
  render() {
    if (Object.keys(this.model.data).length === 0 || !this.model.data['tokenAddress']) {
      return BlockFactory.renderEmptyState(this.model, this.onEditCallback!)
    }

    const tokenAddress = this.model.data["tokenAddress"]
    const tokenId = this.model.data["tokenId"]
    const includeOwner = this.model.data["includeOwner"] === 'on'

    if (includeOwner) {
      return (
        <div style={{ width: "100%", height: "100%" }}>
          <NFTE contract={tokenAddress} tokenId={tokenId} />
        </div>
      )
    }

    return (
      <NFTCard tokenAddress={tokenAddress}
        tokenId={tokenId}
        theme={this.theme}
      />
    );
  }

  renderEditModal(done: (data: BlockModel) => void) {
    const onFinish = (event: any) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      console.log(data)
      let url = data.get('url') as string
      // parse the url for the contract address and token id
      const { tokenAddress, tokenId } = parseOpenSeaURL(url)
      this.model.data['url'] = url
      this.model.data['tokenId'] = tokenId ?? ""
      this.model.data['tokenAddress'] = tokenAddress ?? ""

      done(this.model)
    };

    function parseOpenSeaURL(url: string) {
      const parts = url.split('/');
      // Check if the URL has at least 7 parts and the contract address starts with '0x'
      if (parts.length < 7 || !parts[5].startsWith('0x')) {
        return { error: "Malformed URL" };
      }

      const tokenAddress = parts[5];
      const tokenId = parts[6];

      return { tokenAddress, tokenId };
    }

    const OwnerToggle = () => {
      const [includeOwner, setIncludeOwner] = useState<string>(this.model.data['includeOwner']);
      const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(event.target.checked)
        const val = event.target.checked ? 'on' : 'off'
        this.model.data['includeOwner'] = val
        setIncludeOwner(val)
      };

      return (
        <FormGroup>
          <FormControlLabel control={<Checkbox
            title='includeOwner'
            defaultValue={this.model.data['includeOwner'] == 'on'}
            value={includeOwner}
            onChange={handleToggleChange}
          />} label="Include owner information" />
        </FormGroup>
      );
    }

    return (
      <Box
        component="form"
        onSubmit={onFinish}
        style={{}}
      >
        <TextField
          autoFocus
          margin="dense"
          id="nft-link"
          label="Paste an OpenSea link:"
          type="url"
          fullWidth
          variant="outlined"
          required
          defaultValue={this.model.data['url']}
          name="url"
        />
        <OwnerToggle />
        <Button
          type="submit"
          variant="contained"
          className="save-modal-button"
          sx={{ mt: 3, mb: 2 }}
        >
          Save
        </Button>
      </Box>
    )
  }

  renderErrorState() {
    return (
      <h1>Error!</h1>
    )
  }
}