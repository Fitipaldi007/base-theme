/**
 * ScandiPWA - Progressive Web App for Magento
 *
 * Copyright © Scandiweb, Inc. All rights reserved.
 * See LICENSE for license details.
 *
 * @license OSL-3.0 (Open Software License ("OSL") v. 3.0)
 * @package scandipwa/base-theme
 * @link https://github.com/scandipwa/base-theme
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CategoryProductList from 'Component/CategoryProductList';
import ContentWrapper from 'Component/ContentWrapper';
import CategoryDetails from 'Component/CategoryDetails';
import CategorySort from 'Component/CategorySort';
import TextPlaceholder from 'Component/TextPlaceholder';
import CategoryFilterOverlay from 'Component/CategoryFilterOverlay';
import Meta from 'Component/Meta';
import { CategoryTreeType } from 'Type/Category';
import { ItemsType } from 'Type/ProductList';
import {
    getUrlParam,
    getQueryParam,
    setQueryParams,
    clearQueriesFromUrl
} from 'Util/Url';

import Store from 'Store';
import { CATEGORY } from 'Component/Header';
import { toggleOverlayByKey } from 'Store/Overlay';
import { changeHeaderState } from 'Store/Header';

import './CategoryPage.style';

class CategoryPage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            sortKey: 'name',
            sortDirection: 'ASC',
            defaultPriceRange: { min: 0, max: 300 },
            minPriceRange: 0,
            maxPriceRange: 300,
            previousPage: 0,
            pageSize: 12
        };

        this.onSortChange = this.onSortChange.bind(this);
        this.updatePriceRange = this.updatePriceRange.bind(this);
        this.updateFilter = this.updateFilter.bind(this);
    }

    componentDidMount() {
        const { updateBreadcrumbs, isOnlyPlaceholder, updateLoadStatus } = this.props;

        if (!isOnlyPlaceholder) {
            if (this.isNewCategory()) updateBreadcrumbs({});
            else this.onCategoryUpdate();

            this.requestCategory();
        } else {
            updateLoadStatus(true);
        }
    }

    componentDidUpdate(prevProps) {
        const { location, category: { id }, categoryIds } = this.props;
        const { category: { id: prevId }, categoryIds: prevCategoryIds } = prevProps;

        // update breadcrumbs only if category has changed
        if (id !== prevId) this.onCategoryUpdate();

        // update category only if route or search query has been changed
        if (this.urlHasChanged(location, prevProps) || categoryIds !== prevCategoryIds) this.requestCategory();
    }

    /**
     * Set request query parameters on sort direction change
     * @param {String} direction sort directions
     * @return {void}
     */
    onSortChange(sortDirection, sortKey) {
        const { location, history } = this.props;

        setQueryParams({ sortKey }, location, history);
        setQueryParams({ sortDirection }, location, history);
    }

    onCategoryUpdate() {
        this.updateBreadcrumbs();
        this.updateHeaderState();
    }

    /**
     * Get price max and min from browser url
     * @return {{min: Number, max: Number}} values selected in price filter
     */
    getPriceRangeFromUrl() {
        const { location } = this.props;
        const { defaultPriceRange: { min, max } } = this.state;

        const priceMinFromUrl = getQueryParam('priceMin', location);
        const priceMaxFromUrl = getQueryParam('priceMax', location);

        return {
            min: priceMinFromUrl ? parseInt(priceMinFromUrl, 10) : min,
            max: priceMaxFromUrl ? parseInt(priceMaxFromUrl, 10) : max
        };
    }

    /**
     * Get specific filter from url
     * @param {String} filterName Name of the filter
     * @return {Boolean}
     */
    getFilterFromUrl(filterName) {
        return this.getCustomFiltersFromUrl()[filterName] || [];
    }

    /**
     * Get custom fitler parametrs from browser url
     * @return {Object} object of custom filter parametrs
     */
    getCustomFiltersFromUrl() {
        const { location } = this.props;
        const customFilters = {};
        const customFiltersString = getQueryParam('customFilters', location);

        if (customFiltersString) {
            customFiltersString.split(';').forEach((filter) => {
                const [key, value] = filter.split(':');
                customFilters[key] = value.split(',');
            });
        }

        return customFilters;
    }

    /**
     * Get current category path
     * @return {String} path to current category
     */
    getCategoryUrlPath() {
        const { location, match } = this.props;
        return getUrlParam(match, location);
    }

    /**
     * Check if url was changed
     * @return {Boolean}
     */
    urlHasChanged(location, prevProps) {
        const pathnameHasChanged = location.pathname !== prevProps.location.pathname;
        const searcQueryHasChanged = location.search !== prevProps.location.search;

        return pathnameHasChanged || searcQueryHasChanged;
    }

    /**
     * Prepare and dispatch category request
     * @return {void}
     */
    requestCategory() {
        const {
            requestCategory,
            location,
            items,
            category,
            categoryIds
        } = this.props;

        const {
            sortKey,
            sortDirection,
            previousPage,
            pageSize
        } = this.state;

        const categoryUrlPath = !categoryIds ? this.getCategoryUrlPath() : null;
        const currentPage = getQueryParam('page', location) || 1;
        const priceRange = this.getPriceRangeFromUrl();
        const customFilters = this.getCustomFiltersFromUrl();
        const querySortKey = getQueryParam('sortKey', location);
        const querySortDirection = getQueryParam('sortDirection', location);
        const options = {
            categoryUrlPath,
            currentPage,
            previousPage,
            pageSize,
            priceRange,
            customFilters,
            categoryIds,
            sortKey: querySortKey || sortKey,
            sortDirection: querySortDirection || sortDirection,
            productsLoaded: items.length,
            // TODO: adding configurable data request (as in PDP) to query, should make a seperate/more specific query
            getConfigurableData: true,
            isCategoryLoaded: (!!Object.entries(category).length)
        };

        const stateUpdate = {
            previousPage: currentPage
        };

        if (querySortKey) {
            stateUpdate.sortKey = querySortKey;
        }

        if (querySortDirection) {
            stateUpdate.sortDirection = querySortDirection;
        }

        this.setState(stateUpdate);

        requestCategory(options);
    }

    /**
     * Check if Category url path changed
     * @return {Boolean}
     */
    isNewCategory() {
        const { category } = this.props;
        return category.url_path !== this.getCategoryUrlPath();
    }

    updateHeaderState() {
        const {
            changeHeaderState,
            category: { name },
            history
        } = this.props;

        changeHeaderState({
            name: CATEGORY,
            title: name,
            onBackClick: () => history.push('/')
        });
    }

    /**
     * Dispatch breadcrumbs update
     * @return {void}
     */
    updateBreadcrumbs() {
        const { category, updateBreadcrumbs } = this.props;
        const shouldUpdate = Object.keys(category).length;
        if (shouldUpdate) updateBreadcrumbs(category);
    }

    /**
     * Update Query parameters for price range
     * @return {void}
     */
    updatePriceRange(priceRange) {
        const { location, history } = this.props;

        setQueryParams({
            priceMax: priceRange.max,
            priceMin: priceRange.min,
            page: ''
        }, location, history);
    }

    /**
     * Update Query parameters for custom filters
     * @return {void}
     */
    updateFilter(filterName, filterArray) {
        const { location, history } = this.props;
        const prevCustomFilters = this.getCustomFiltersFromUrl();

        prevCustomFilters[filterName] = filterArray;

        const customFiltersString = Object.keys(prevCustomFilters)
            .reduce((accumulator, prevFilterName) => {
                if (prevCustomFilters[prevFilterName].length) {
                    const filterValues = prevCustomFilters[prevFilterName].sort().join(',');

                    accumulator.push(`${prevFilterName}:${filterValues}`);
                }

                return accumulator;
            }, [])
            .sort()
            .join(';');

        let customFilters;

        const hasTrailingSemicolon = customFiltersString[customFiltersString.length - 1] === ';';
        const hasLeadingSemicolon = customFiltersString[0] === ';';

        customFilters = hasTrailingSemicolon ? customFiltersString.slice(0, -1) : customFiltersString;
        customFilters = hasLeadingSemicolon ? customFilters.slice(1) : customFilters;

        setQueryParams({
            customFilters,
            page: ''
        }, location, history);
    }

    /**
     * Increase page number, cannot exceed calculated page amount.
     * @return {void}
     */
    increasePage() {
        const {
            location,
            history,
            isLoading,
            totalItems
        } = this.props;
        const { pageSize } = this.state;
        const pageFromUrl = getQueryParam('page', location) || 1;
        const totalPages = Math.floor(totalItems / pageSize);
        const currentPage = totalPages < pageFromUrl ? totalPages : pageFromUrl;

        if (!isLoading) {
            setQueryParams({ page: parseInt(currentPage, 10) + 1 }, location, history);
        }
    }

    /**
     * Clear all filters
     * @return {void}
     */
    clearFilters(location, history) {
        const { sortKey, sortDirection } = this.state;
        const page = getQueryParam('page', location) || 1;
        clearQueriesFromUrl(history);
        setQueryParams({ sortKey, sortDirection, page }, location, history);
    }

    renderItemCount() {
        const { totalItems, isLoading } = this.props;

        const content = isLoading
            ? 'Products are loading...'
            : `${ totalItems } items found`;

        return (
            <p block="CategoryPage" elem="ItemsCount">
                <TextPlaceholder content={ content } />
            </p>
        );
    }

    render() {
        const {
            category,
            items,
            totalItems,
            sortFields,
            filters,
            isLoading
        } = this.props;

        const {
            sortKey,
            sortDirection,
            minPriceRange,
            maxPriceRange
        } = this.state;

        const { options } = sortFields;

        const updatedSortFields = options && Object.values(options).map(option => ({
            id: option.value,
            label: option.label
        }));

        const customFilters = this.getCustomFiltersFromUrl();

        return (
            <main block="CategoryPage">
                <ContentWrapper
                  wrapperMix={ { block: 'CategoryPage', elem: 'Wrapper' } }
                  label="Category page"
                >
                    <Meta metaObject={ category } />
                    <CategoryFilterOverlay
                      availableFilters={ filters }
                      customFiltersValues={ customFilters }
                      updateFilter={ this.updateFilter }
                      updatePriceRange={ this.updatePriceRange }
                      priceValue={ this.getPriceRangeFromUrl() }
                      minPriceValue={ minPriceRange }
                      maxPriceValue={ maxPriceRange }
                    />
                    <CategoryDetails
                      category={ category }
                    />
                    <aside block="CategoryPage" elem="Miscellaneous">
                        { this.renderItemCount() }
                        <CategorySort
                          onSortChange={ this.onSortChange }
                          sortFields={ updatedSortFields }
                          sortKey={ sortKey }
                          sortDirection={ sortDirection }
                        />
                        <button
                          block="CategoryPage"
                          elem="Filter"
                          onClick={ () => {
                              Store.dispatch(toggleOverlayByKey('category-filter'));
                              Store.dispatch(changeHeaderState({ name: 'filter', title: 'Filters' }));
                          } }
                        >
                            Filter
                        </button>
                    </aside>
                    <CategoryProductList
                      items={ items }
                      customFilters={ customFilters }
                      availableFilters={ filters }
                      totalItems={ totalItems }
                      increasePage={ () => this.increasePage() }
                      isLoading={ isLoading }
                    />
                </ContentWrapper>
            </main>
        );
    }
}

CategoryPage.propTypes = {
    history: PropTypes.shape({
        location: PropTypes.object.isRequired,
        push: PropTypes.func.isRequired
    }).isRequired,
    category: CategoryTreeType.isRequired,
    items: ItemsType.isRequired,
    totalItems: PropTypes.number.isRequired,
    location: PropTypes.shape({
        pathname: PropTypes.string.isRequired
    }).isRequired,
    match: PropTypes.shape({
        path: PropTypes.string.isRequired
    }).isRequired,
    requestCategory: PropTypes.func.isRequired,
    changeHeaderState: PropTypes.func.isRequired,
    updateBreadcrumbs: PropTypes.func.isRequired,
    updateLoadStatus: PropTypes.func.isRequired,
    filters: PropTypes.arrayOf(PropTypes.shape).isRequired,
    sortFields: PropTypes.shape({
        options: PropTypes.array
    }).isRequired,
    isLoading: PropTypes.bool.isRequired,
    categoryIds: PropTypes.number,
    isOnlyPlaceholder: PropTypes.bool
};

CategoryPage.defaultProps = {
    categoryIds: 0,
    isOnlyPlaceholder: false
};

export default CategoryPage;
