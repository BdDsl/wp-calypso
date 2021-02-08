/**
 * External dependencies
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import {
	CheckoutModal,
	FormStatus,
	useFormStatus,
	useEvents,
	Button,
} from '@automattic/composite-checkout';
import { useTranslate } from 'i18n-calypso';
import { useSelector } from 'react-redux';

/**
 * Internal dependencies
 */
import joinClasses from './join-classes';
import { useHasDomainsInCart } from '../hooks/has-domains';
import { ItemVariationPicker } from './item-variation-picker';
import {
	isGoogleWorkspaceProductSlug,
	isGSuiteOrExtraLicenseProductSlug,
	isGSuiteOrGoogleWorkspaceProductSlug,
} from 'calypso/lib/gsuite';
import { planMatches, isWpComPlan } from 'calypso/lib/plans';
import {
	isMonthly as isMonthlyPlan,
	TERM_ANNUALLY,
	TERM_BIENNIALLY,
} from 'calypso/lib/plans/constants';
import { currentUserHasFlag, getCurrentUser } from 'calypso/state/current-user/selectors';
import { NON_PRIMARY_DOMAINS_TO_FREE_USERS } from 'calypso/state/current-user/constants';
import { TITAN_MAIL_MONTHLY_SLUG } from 'calypso/lib/titan/constants';
import { getSublabel, getLabel } from '../lib/translate-cart';
import { isPlan } from 'calypso/lib/products-values';

export function WPOrderReviewSection( { children, className } ) {
	return <div className={ joinClasses( [ className, 'order-review-section' ] ) }>{ children }</div>;
}

WPOrderReviewSection.propTypes = {
	className: PropTypes.string,
};

function WPLineItem( {
	item,
	className,
	hasDeleteButton,
	removeProductFromCart,
	getItemVariants,
	onChangePlanLength,
	isSummary,
	createUserAndSiteBeforeTransaction,
} ) {
	const product = item.wpcom_response_cart_product; // might be undefined for items like tax, coupon, etc.
	const id = product?.uuid ?? item.id;
	const type = isPlan( product ) ? 'plan' : product?.product_slug;
	const translate = useTranslate();
	const hasDomainsInCart = useHasDomainsInCart();
	const { formStatus } = useFormStatus();
	const itemSpanId = `checkout-line-item-${ id }`;
	const deleteButtonId = `checkout-delete-button-${ id }`;
	const [ isModalVisible, setIsModalVisible ] = useState( false );
	const isPwpoUser = useSelector(
		( state ) =>
			getCurrentUser( state ) && currentUserHasFlag( state, NON_PRIMARY_DOMAINS_TO_FREE_USERS )
	);
	const modalCopy = returnModalCopy(
		type,
		translate,
		hasDomainsInCart,
		createUserAndSiteBeforeTransaction,
		isPwpoUser
	);
	const onEvent = useEvents();
	const isDisabled = formStatus !== FormStatus.READY;

	const isRenewal = !! product?.extra?.purchaseId;
	// Show the variation picker when this is not a renewal
	const shouldShowVariantSelector = getItemVariants && product && ! isRenewal;

	const productSlug = product?.product_slug;

	const isGSuite =
		isGSuiteOrExtraLicenseProductSlug( productSlug ) || isGoogleWorkspaceProductSlug( productSlug );

	const isTitanMail = productSlug === TITAN_MAIL_MONTHLY_SLUG;

	const sublabel = product ? String( getSublabel( product ) ) : '';
	const label = product ? getLabel( product ) : item.label;

	let originalAmountDisplay = item.wpcom_meta?.item_original_subtotal_display;
	let originalAmountInteger = item.wpcom_meta?.item_original_subtotal_integer;
	if ( item.wpcom_meta?.related_monthly_plan_cost_integer ) {
		originalAmountInteger = item.wpcom_meta?.related_monthly_plan_cost_integer;
		originalAmountDisplay = item.wpcom_meta?.related_monthly_plan_cost_display;
	}
	const actualAmountDisplay = item.amount.displayValue;
	const isDiscounted = item.amount.value < originalAmountInteger && originalAmountDisplay;

	/* eslint-disable wpcalypso/jsx-classname-namespace */
	return (
		<div
			className={ joinClasses( [ className, 'checkout-line-item' ] ) }
			data-e2e-product-slug={ productSlug }
			data-product-type={ type }
		>
			<LineItemTitle id={ itemSpanId } isSummary={ isSummary }>
				{ label }
			</LineItemTitle>
			<span aria-labelledby={ itemSpanId } className="checkout-line-item__price">
				<LineItemPrice
					isDiscounted={ isDiscounted }
					actualAmount={ actualAmountDisplay }
					originalAmount={ originalAmountDisplay }
					isSummary={ isSummary }
				/>
			</span>
			{ sublabel && (
				<LineItemMeta>
					<LineItemSublabelAndPrice product={ product } />
					<DomainDiscountCallout product={ product } />
					<AnnualDiscountCallout product={ product } />
				</LineItemMeta>
			) }
			{ isGSuite && <GSuiteUsersList product={ item.wpcom_response_cart_product } /> }
			{ isTitanMail && (
				<TitanMailMeta product={ item.wpcom_response_cart_product } isRenewal={ isRenewal } />
			) }
			{ hasDeleteButton && formStatus === FormStatus.READY && (
				<>
					<DeleteButton
						className="checkout-line-item__remove-product"
						buttonType="borderless"
						disabled={ isDisabled }
						onClick={ () => {
							setIsModalVisible( true );
							onEvent( {
								type: 'a8c_checkout_delete_product_press',
								payload: {
									product_name: label,
								},
							} );
						} }
					>
						<DeleteIcon uniqueID={ deleteButtonId } product={ label } />
					</DeleteButton>

					<CheckoutModal
						isVisible={ isModalVisible }
						closeModal={ () => {
							setIsModalVisible( false );
						} }
						primaryAction={ () => {
							removeProductFromCart( item.wpcom_meta.uuid );
							onEvent( {
								type: 'a8c_checkout_delete_product',
								payload: {
									product_name: label,
								},
							} );
						} }
						cancelAction={ () => {
							onEvent( {
								type: 'a8c_checkout_cancel_delete_product',
							} );
						} }
						title={ modalCopy.title }
						copy={ modalCopy.description }
					/>
				</>
			) }

			{ shouldShowVariantSelector && (
				<ItemVariationPicker
					selectedItem={ item }
					getItemVariants={ getItemVariants }
					onChangeItemVariant={ onChangePlanLength }
					isDisabled={ isDisabled }
				/>
			) }
		</div>
	);
}

WPLineItem.propTypes = {
	className: PropTypes.string,
	total: PropTypes.bool,
	tax: PropTypes.bool,
	subtotal: PropTypes.bool,
	isSummary: PropTypes.bool,
	hasDeleteButton: PropTypes.bool,
	removeProductFromCart: PropTypes.func,
	item: PropTypes.shape( {
		label: PropTypes.string,
		amount: PropTypes.shape( {
			displayValue: PropTypes.string,
		} ),
	} ),
	getItemVariants: PropTypes.func,
	onChangePlanLength: PropTypes.func,
	createUserAndSiteBeforeTransaction: PropTypes.bool,
};

function LineItemPrice( { isDiscounted, actualAmount, originalAmount, isSummary } ) {
	return (
		<LineItemPriceWrapper isSummary={ isSummary }>
			{ isDiscounted ? (
				<>
					<s>{ originalAmount }</s> { actualAmount }
				</>
			) : (
				actualAmount
			) }
		</LineItemPriceWrapper>
	);
}

export const LineItem = styled( WPLineItem )`
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	font-weight: ${ ( { theme, total } ) => ( total ? theme.weights.bold : theme.weights.normal ) };
	color: ${ ( { theme, total } ) =>
		total ? theme.colors.textColorDark : theme.colors.textColor };
	font-size: ${ ( { total } ) => ( total ? '1.2em' : '1.1em' ) };
	padding: ${ ( { total, tax, subtotal } ) => ( total || subtotal || tax ? '10px 0' : '20px 0' ) };
	border-bottom: ${ ( { theme, total } ) =>
		total ? 0 : '1px solid ' + theme.colors.borderColorLight };
	position: relative;

	.is-summary & {
		padding: 10px 0;
		border-bottom: 0;
	}

	.checkout-line-item__price {
		position: relative;
	}
`;

const LineItemMeta = styled.div`
	color: ${ ( props ) => props.theme.colors.textColorLight };
	display: flex;
	font-size: 14px;
	justify-content: space-between;
	width: 100%;
`;

const DiscountCallout = styled.div`
	color: ${ ( props ) => props.theme.colors.success };
	text-align: right;

	.rtl & {
		text-align: left;
	}
`;

const LineItemTitle = styled.div`
	flex: 1;
	word-break: break-word;
	font-size: ${ ( { isSummary } ) => ( isSummary ? '14px' : '16px' ) };
`;

const LineItemPriceWrapper = styled.span`
	margin-left: 12px;
	font-size: ${ ( { isSummary } ) => ( isSummary ? '14px' : '16px' ) };

	.rtl & {
		margin-right: 12px;
		margin-left: 0;
	}
`;

const DeleteButton = styled( Button )`
	position: absolute;
	padding: 10px;
	right: -50px;
	top: 7px;

	:hover rect {
		fill: ${ ( props ) => props.theme.colors.error };
	}

	svg {
		opacity: 1;
	}

	.rtl & {
		right: auto;
		left: -50px;
	}
`;

function DeleteIcon( { uniqueID, product } ) {
	const translate = useTranslate();

	return (
		<svg
			width="25"
			height="24"
			viewBox="0 0 25 24"
			xmlns="http://www.w3.org/2000/svg"
			aria-labelledby={ uniqueID }
		>
			<title id={ uniqueID }>
				{ translate( 'Remove %s from cart', {
					args: product,
				} ) }
			</title>
			<mask
				id="trashIcon"
				mask-type="alpha"
				maskUnits="userSpaceOnUse"
				x="5"
				y="3"
				width="15"
				height="18"
			>
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M15.4456 3L16.4456 4H19.9456V6H5.94557V4H9.44557L10.4456 3H15.4456ZM6.94557 19C6.94557 20.1 7.84557 21 8.94557 21H16.9456C18.0456 21 18.9456 20.1 18.9456 19V7H6.94557V19ZM8.94557 9H16.9456V19H8.94557V9Z"
					fill="white"
				/>
			</mask>
			<g mask="url(#trashIcon)">
				<rect x="0.945572" width="24" height="24" fill="#8E9196" />
			</g>
		</svg>
	);
}

export function WPOrderReviewTotal( { total, className = null } ) {
	return (
		<div className={ joinClasses( [ className, 'order-review-total' ] ) }>
			<LineItem total item={ total } />
		</div>
	);
}

export function WPOrderReviewLineItems( {
	items,
	className,
	isSummary,
	removeProductFromCart,
	removeCoupon,
	getItemVariants,
	onChangePlanLength,
	createUserAndSiteBeforeTransaction,
} ) {
	return (
		<WPOrderReviewList className={ joinClasses( [ className, 'order-review-line-items' ] ) }>
			{ items
				.filter( ( item ) => item.label ) // remove items without a label
				.filter( ( item ) => {
					if ( isSummary && ! shouldLineItemBeShownWhenStepInactive( item ) ) {
						return false;
					}
					return true;
				} )
				.map( ( item ) => {
					return (
						<WPOrderReviewListItem key={ item.id }>
							<LineItem
								item={ item }
								hasDeleteButton={ ! isSummary && canItemBeDeleted( item ) }
								removeProductFromCart={
									item.type === 'coupon' ? removeCoupon : removeProductFromCart
								}
								getItemVariants={ getItemVariants }
								onChangePlanLength={ onChangePlanLength }
								isSummary={ isSummary }
								createUserAndSiteBeforeTransaction={ createUserAndSiteBeforeTransaction }
							/>
						</WPOrderReviewListItem>
					);
				} ) }
		</WPOrderReviewList>
	);
}

WPOrderReviewLineItems.propTypes = {
	className: PropTypes.string,
	isSummary: PropTypes.bool,
	removeProductFromCart: PropTypes.func,
	removeCoupon: PropTypes.func,
	items: PropTypes.arrayOf(
		PropTypes.shape( {
			label: PropTypes.string,
			amount: PropTypes.shape( {
				displayValue: PropTypes.string,
			} ),
		} )
	),
	getItemVariants: PropTypes.func,
	onChangePlanLength: PropTypes.func,
};

const WPOrderReviewList = styled.ul`
	border-top: 1px solid ${ ( props ) => props.theme.colors.borderColorLight };
	box-sizing: border-box;
	margin: 20px 30px 20px 0;
	padding: 0;

	.rtl & {
		margin: 20px 0 20px 30px;
	}

	.is-summary & {
		border-top: 0;
		margin: 0;
	}
`;

const WPOrderReviewListItem = styled.li`
	margin: 0;
	padding: 0;
	display: block;
	list-style: none;
`;

function GSuiteUsersList( { product } ) {
	const users = product.extra?.google_apps_users ?? [];
	return (
		<>
			{ users.map( ( user, index ) => {
				return (
					<LineItemMeta key={ user.email }>
						<div key={ user.email }>{ user.email }</div>
						{ index === 0 && <GSuiteDiscountCallout product={ product } /> }
					</LineItemMeta>
				);
			} ) }
		</>
	);
}

function TitanMailMeta( { product, isRenewal } ) {
	const translate = useTranslate();
	const quantity = product.extra?.new_quantity ?? 1;
	const domainName = product.meta;
	const translateArgs = {
		args: {
			numberOfMailboxes: quantity,
			domainName,
		},
		count: quantity,
	};
	return (
		<LineItemMeta>
			{ isRenewal
				? translate(
						'%(numberOfMailboxes)d mailbox for %(domainName)s',
						'%(numberOfMailboxes)d mailboxes for %(domainName)s',
						translateArgs
				  )
				: translate(
						'%(numberOfMailboxes)d new mailbox for %(domainName)s',
						'%(numberOfMailboxes)d new mailboxes for %(domainName)s',
						translateArgs
				  ) }
		</LineItemMeta>
	);
}

function returnModalCopy(
	product,
	translate,
	hasDomainsInCart,
	createUserAndSiteBeforeTransaction,
	isPwpoUser
) {
	const modalCopy = {};
	const productType = product === 'plan' && hasDomainsInCart ? 'plan with dependencies' : product;

	switch ( productType ) {
		case 'plan with dependencies':
			modalCopy.title = translate( 'You are about to remove your plan from the cart' );

			if ( createUserAndSiteBeforeTransaction ) {
				modalCopy.description =
					'When you press Continue, we will remove your plan from the cart. Your site will be created on the free plan when you complete payment for the other product(s) in your cart.';
			} else {
				modalCopy.description = isPwpoUser
					? translate(
							'When you press Continue, we will remove your plan from the cart and your site will continue to run with its current plan.'
					  )
					: translate(
							'When you press Continue, we will remove your plan from the cart and your site will continue to run with its current plan. Since your other product(s) depend on your plan to be purchased, they will also be removed from the cart and we will take you back to your site.'
					  );
			}
			break;
		case 'plan':
			modalCopy.title = translate( 'You are about to remove your plan from the cart' );
			modalCopy.description = createUserAndSiteBeforeTransaction
				? 'When you press Continue, we will remove your plan from the cart.'
				: translate(
						'When you press Continue, we will remove your plan from the cart and your site will continue to run with its current plan. We will then take you back to your site.'
				  );
			break;
		case 'domain':
			modalCopy.title = translate( 'You are about to remove your domain from the cart' );
			modalCopy.description = translate(
				'When you press Continue, we will remove your domain from the cart and you will have no claim for the domain name you picked.'
			);
			break;
		case 'coupon':
			modalCopy.title = translate( 'You are about to remove your coupon from the cart' );
			modalCopy.description = translate(
				'When you press Continue, we will need you to confirm your payment details.'
			);
			break;
		default:
			modalCopy.title = translate( 'You are about to remove your product from the cart' );
			modalCopy.description = createUserAndSiteBeforeTransaction
				? 'When you press Continue, we will remove your product from the cart.'
				: translate(
						'When you press Continue, we will remove your product from the cart and your site will continue to run without it.'
				  );
	}

	return modalCopy;
}

function canItemBeDeleted( item ) {
	const itemTypesThatCannotBeDeleted = [ 'domain_redemption', 'tax', 'credits' ];
	return ! itemTypesThatCannotBeDeleted.includes( item.type );
}

function shouldLineItemBeShownWhenStepInactive( item ) {
	const itemTypesToIgnore = [ 'tax' ];
	return ! itemTypesToIgnore.includes( item.type );
}

function LineItemSublabelAndPrice( { product } ) {
	const translate = useTranslate();
	const isDomainRegistration = product.is_domain_registration;
	const isDomainMap = product.product_slug === 'domain_map';
	const productSlug = product.product_slug;
	const sublabel = String( getSublabel( product ) );
	const type = isPlan( product ) ? 'plan' : product.product_slug;

	const isGSuite =
		isGSuiteOrExtraLicenseProductSlug( productSlug ) || isGoogleWorkspaceProductSlug( productSlug );

	if ( type === 'plan' && product.months_per_bill_period > 1 ) {
		return translate( '%(sublabel)s: %(monthlyPrice)s /month × %(monthsPerBillPeriod)s', {
			args: {
				sublabel: sublabel,
				monthlyPrice: product.item_subtotal_monthly_cost_display,
				monthsPerBillPeriod: product.months_per_bill_period,
			},
			comment: 'product type and monthly breakdown of total cost, separated by a colon',
		} );
	}

	if ( type === 'plan' && product.months_per_bill_period === 1 ) {
		if ( isWpComPlan( productSlug ) ) {
			return translate( 'Monthly subscription' );
		}

		return translate( '%(sublabel)s: %(monthlyPrice)s per month', {
			args: {
				sublabel: sublabel,
				monthlyPrice: product.item_subtotal_monthly_cost_display,
			},
			comment: 'product type and monthly breakdown of total cost, separated by a colon',
		} );
	}

	if (
		( isDomainRegistration || isDomainMap || isGSuite ) &&
		product.months_per_bill_period === 12
	) {
		const premiumLabel = product.extra?.premium ? translate( 'Premium' ) : null;
		return translate( '%(premiumLabel)s %(sublabel)s: %(interval)s', {
			args: {
				premiumLabel,
				sublabel: sublabel,
				interval: translate( 'billed annually' ),
			},
			comment:
				'premium label, product type and billing interval, separated by a colon. ex: ".blog domain registration: billed annually" or "Premium .blog domain registration: billed annually"',
		} );
	}
	return sublabel || null;
}

function AnnualDiscountCallout( { product } ) {
	const translate = useTranslate();
	const planSlug = product.product_slug;

	if ( ! isWpComPlan( planSlug ) || isMonthlyPlan( planSlug ) ) {
		return null;
	}

	if ( planMatches( planSlug, { term: TERM_ANNUALLY } ) ) {
		return <DiscountCallout>{ translate( 'Annual discount' ) }</DiscountCallout>;
	}

	if ( planMatches( planSlug, { term: TERM_BIENNIALLY } ) ) {
		return <DiscountCallout>{ translate( 'Biennial discount' ) }</DiscountCallout>;
	}

	return null;
}

function DomainDiscountCallout( { product } ) {
	const translate = useTranslate();

	const isFreeBundledDomainRegistration = product.is_bundled && product.item_subtotal_integer === 0;
	if ( isFreeBundledDomainRegistration ) {
		return <DiscountCallout>{ translate( 'Discount for first year' ) }</DiscountCallout>;
	}

	const isFreeDomainMapping =
		product.product_slug === 'domain_map' && product.item_subtotal_integer === 0;
	if ( isFreeDomainMapping ) {
		return <DiscountCallout>{ translate( 'Free with your plan' ) }</DiscountCallout>;
	}

	return null;
}

function GSuiteDiscountCallout( { product } ) {
	const translate = useTranslate();

	const isGSuite = isGSuiteOrGoogleWorkspaceProductSlug( product.product_slug );

	if (
		isGSuite &&
		product.item_original_subtotal_integer < product.item_original_subtotal_integer &&
		product.is_sale_coupon_applied
	) {
		return <DiscountCallout>{ translate( 'Discount for first year' ) }</DiscountCallout>;
	}
	return null;
}
