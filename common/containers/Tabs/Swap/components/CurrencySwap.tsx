import { TShowNotification } from 'actions/notifications';
import {
  TChangeStepSwap,
  TDestinationAmountSwap,
  TDestinationKindSwap,
  TOriginAmountSwap,
  TOriginKindSwap
} from 'actions/swap';
import SimpleButton from 'components/ui/SimpleButton';
import bityConfig, { generateKindMax, generateKindMin } from 'config/bity';
import React, { Component } from 'react';
import translate from 'translations';
import { combineAndUpper, toFixedIfLarger } from 'utils/formatters';
import './CurrencySwap.scss';
import { Dropdown } from 'components/ui';
import Spinner from 'components/ui/Spinner';

export interface StateProps {
  bityRates: any;
  originAmount: number | null;
  destinationAmount: number | null;
  originKind: string;
  destinationKind: string;
  destinationKindOptions: string[];
  originKindOptions: string[];
}

export interface ActionProps {
  showNotification: TShowNotification;
  changeStepSwap: TChangeStepSwap;
  originKindSwap: TOriginKindSwap;
  destinationKindSwap: TDestinationKindSwap;
  originAmountSwap: TOriginAmountSwap;
  destinationAmountSwap: TDestinationAmountSwap;
}

interface State {
  disabled: boolean;
  showedMinMaxError: boolean;
  originErr: string;
  destinationErr: string;
}

export default class CurrencySwap extends Component<
  StateProps & ActionProps,
  State
> {
  public state = {
    disabled: true,
    showedMinMaxError: false,
    originErr: '',
    destinationErr: ''
  };

  public isMinMaxValid = (amount, kind) => {
    let bityMin;
    let bityMax;
    if (kind !== 'BTC') {
      const bityPairRate = this.props.bityRates['BTC' + kind];
      bityMin = generateKindMin(bityPairRate, kind);
      bityMax = generateKindMax(bityPairRate, kind);
    } else {
      bityMin = bityConfig.BTCMin;
      bityMax = bityConfig.BTCMax;
    }
    const higherThanMin = amount >= bityMin;
    const lowerThanMax = amount <= bityMax;
    return higherThanMin && lowerThanMax;
  };

  public isDisabled = (originAmount, originKind, destinationAmount) => {
    const hasOriginAmountAndDestinationAmount =
      originAmount && destinationAmount;
    const minMaxIsValid = this.isMinMaxValid(originAmount, originKind);
    return !(hasOriginAmountAndDestinationAmount && minMaxIsValid);
  };

  public setDisabled(originAmount, originKind, destinationAmount) {
    const disabled = this.isDisabled(
      originAmount,
      originKind,
      destinationAmount
    );

    if (disabled && originAmount) {
      const { bityRates } = this.props;
      const ETHMin = generateKindMin(bityRates.BTCETH, 'ETH');
      const ETHMax = generateKindMax(bityRates.BTCETH, 'ETH');
      const REPMin = generateKindMin(bityRates.BTCREP, 'REP');

      let minAmount;
      let maxAmount;
      switch (originKind) {
        case 'BTC':
          minAmount = toFixedIfLarger(bityConfig.BTCMin, 3);
          maxAmount = toFixedIfLarger(bityConfig.BTCMax, 3);
          break;
        case 'ETH':
          minAmount = toFixedIfLarger(ETHMin, 3);
          maxAmount = toFixedIfLarger(ETHMax, 3);
          break;
        case 'REP':
          minAmount = toFixedIfLarger(REPMin, 3);
          break;
        default:
          console.log('Something went terribly wrong!');
      }
      const errString = `Min ${minAmount} ${originKind}. Max ${maxAmount} ${originKind}.`;

      this.setState({
        originErr: errString
      });
    } else {
      this.setState({
        originErr: ''
      });
      this.setState({
        disabled
      });
    }
  }

  public onClickStartSwap = () => {
    this.props.changeStepSwap(2);
  };

  public setOriginAndDestinationToNull = () => {
    this.props.originAmountSwap(null);
    this.props.destinationAmountSwap(null);
    this.setDisabled(null, this.props.originKind, null);
  };

  public onChangeOriginAmount = (
    event: React.SyntheticEvent<HTMLInputElement>
  ) => {
    const { destinationKind, originKind } = this.props;
    const amount = (event.target as HTMLInputElement).value;
    const originAmountAsNumber = parseFloat(amount);
    if (originAmountAsNumber || originAmountAsNumber === 0) {
      const pairName = combineAndUpper(originKind, destinationKind);
      const bityRate = this.props.bityRates[pairName];
      this.props.originAmountSwap(originAmountAsNumber);
      const destinationAmount = originAmountAsNumber * bityRate;
      this.props.destinationAmountSwap(destinationAmount);
      this.setDisabled(originAmountAsNumber, originKind, destinationAmount);
    } else {
      this.setOriginAndDestinationToNull();
    }
  };

  public onChangeDestinationAmount = (
    event: React.SyntheticEvent<HTMLInputElement>
  ) => {
    const { destinationKind, originKind } = this.props;
    const amount = (event.target as HTMLInputElement).value;
    const destinationAmountAsNumber = parseFloat(amount);
    if (destinationAmountAsNumber || destinationAmountAsNumber === 0) {
      this.props.destinationAmountSwap(destinationAmountAsNumber);
      const pairNameReversed = combineAndUpper(destinationKind, originKind);
      const bityRate = this.props.bityRates[pairNameReversed];
      const originAmount = destinationAmountAsNumber * bityRate;
      this.props.originAmountSwap(originAmount);
      this.setDisabled(originAmount, originKind, destinationAmountAsNumber);
    } else {
      this.setOriginAndDestinationToNull();
    }
  };

  public render() {
    const {
      originAmount,
      destinationAmount,
      originKind,
      destinationKind,
      destinationKindOptions,
      originKindOptions,
      bityRates
    } = this.props;

    const { originErr, destinationErr } = this.state;

    const OriginKindDropDown = Dropdown as new () => Dropdown<
      typeof originKind
    >;
    const DestinationKindDropDown = Dropdown as new () => Dropdown<
      typeof destinationKind
    >;
    const pairName = combineAndUpper(originKind, destinationKind);
    const bityLoaded = bityRates[pairName];
    return (
      <article className="CurrencySwap">
        <h1 className="CurrencySwap-title">{translate('SWAP_init_1')}</h1>
        {bityLoaded ? (
          <div className="form-inline">
            <div className="CurrencySwap-input-group">
              <span className="CurrencySwap-error-message">{originErr}</span>
              <input
                className={`CurrencySwap-input form-control ${String(
                  originAmount
                ) !== '' && this.isMinMaxValid(originAmount, originKind)
                  ? 'is-valid'
                  : 'is-invalid'}`}
                type="number"
                placeholder="Amount"
                value={originAmount || originAmount === 0 ? originAmount : ''}
                onChange={this.onChangeOriginAmount}
              />
              <OriginKindDropDown
                className="CurrencySwap-dropdown"
                ariaLabel={`change origin kind. current origin kind ${originKind}`}
                options={originKindOptions}
                value={originKind}
                onChange={this.props.originKindSwap}
                size="smr"
                color="default"
              />
            </div>
            <h1 className="CurrencySwap-divider">{translate('SWAP_init_2')}</h1>
            <div className="CurrencySwap-input-group">
              <span className="CurrencySwap-error-message">
                {destinationErr}
              </span>
              <input
                className={`CurrencySwap-input form-control ${String(
                  destinationAmount
                ) !== '' && this.isMinMaxValid(originAmount, originKind)
                  ? 'is-valid'
                  : 'is-invalid'}`}
                type="number"
                placeholder="Amount"
                value={
                  destinationAmount || destinationAmount === 0
                    ? destinationAmount
                    : ''
                }
                onChange={this.onChangeDestinationAmount}
              />
              <DestinationKindDropDown
                className="CurrencySwap-dropdown"
                ariaLabel={`change destination kind. current destination kind ${destinationKind}`}
                options={destinationKindOptions}
                value={destinationKind}
                onChange={this.props.destinationKindSwap}
                size="smr"
                color="default"
              />
            </div>
          </div>
        ) : (
          <Spinner />
        )}

        <div className="CurrencySwap-submit">
          <SimpleButton
            onClick={this.onClickStartSwap}
            text={translate('SWAP_init_CTA')}
            disabled={this.state.disabled}
            type="info"
          />
        </div>
      </article>
    );
  }
}
