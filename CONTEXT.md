# Personal Finance

Walpaca is a personal finance context for recording money events, organizing money by purpose, and understanding spending behavior over time. This glossary defines the shared domain language used across product requirements and product copy.

## Language

### Identity And Roles

**User Account**:
A personal identity used to access Walpaca and own private financial data.
_Avoid_: Account, member, profile

**Full Name**:
The display name shown for a User Account in the Profile and application UI. It is editable without changing the User's login identity.
_Avoid_: Username, login name

**Login Email**:
The unique email address used to identify a User Account and sign in to Walpaca. It is separate from the editable Full Name.
_Avoid_: Display name, username

**Password**:
A secret used with the Login Email to sign in to a User Account. It must contain at least eight characters, including lowercase and uppercase letters.
_Avoid_: PIN, passcode

**Session**:
An authenticated sign-in state represented by an Access Token and Refresh Token. A Session may exist on more than one device.
_Avoid_: User Account, device

**Session Version**:
A server-side version assigned to a User Account's Sessions. Increasing it invalidates every previously issued Access Token and Refresh Token for that User Account.
_Avoid_: Password version, refresh token counter

**Profile Avatar**:
An optional image shown as the visual representation of a User Account in the Profile. If absent, the interface shows the user's initials. It is not an identity credential.
_Avoid_: Profile identity, cover photo

**Admin**:
A role responsible for governing user accounts across the system.
_Avoid_: Superuser, moderator

**User**:
A role for a person who manages their own wallets, transactions, and statistics.
_Avoid_: Customer, member

**Banned Account**:
A user account that has been blocked from using the system by an Admin.
_Avoid_: Deleted account, inactive wallet

### Wallets And Portfolios

**Wallet**:
A named container of money for a specific purpose, such as weekly spending, savings, travel, or investing.
_Avoid_: Account, bucket, cash box

**Parent Wallet**:
A wallet that groups one or more Sub-wallets under a larger money purpose.
_Avoid_: Main account, folder

**Sub-wallet**:
A wallet nested under a Parent Wallet to track a narrower purpose inside that parent.
_Avoid_: Child account, sub account

**Wallet Type**:
The classification of a Wallet that determines whether it represents regular money management or investment-oriented money.
_Avoid_: Account type, category

**Normal Wallet**:
A Wallet used for everyday cash, spending, saving, or goal-based money.
_Avoid_: Cash account, basic wallet

**Investment Portfolio**:
A Wallet that represents one investment account at one broker, used for money allocated to investment assets, including stock-focused portfolios.
_Avoid_: Stock account, brokerage account, portfolio as a separate object

**Investment Holding**:
An individual investment asset held inside one Investment Portfolio, such as a stock, ETF, or future supported asset.
_Avoid_: Portfolio, stock wallet, asset wallet

**Investment Instrument**:
A system-recognized United States stock or ETF selected from a searchable directory using its ticker, name, market, and currency. It is the reference asset used by an Investment Holding.
_Avoid_: Free-text ticker, Investment Holding, Investment Portfolio

**Investment Lot**:
A separately recorded purchase of an Investment Holding, preserving its quantity, price, date, fees, and Investment Exchange Rate. Lots support fractional quantities and are the source record used to calculate realized gains when shares are sold.
_Avoid_: Average Cost record, blended purchase, Holding

**Investment Cost Basis**:
The recorded cost assigned to Investment Holdings or sold shares. Walpaca keeps individual Investment Lots, uses first-in first-out (FIFO) by default for realized gains, and may show Average Cost only as a simplified view of the remaining Holding.
_Avoid_: Current market value, sale price, Wallet Balance

**United States Equity Market**:
The initial supported market for long-only Investment Holdings, covering United States stocks and ETFs quoted in United States dollars. Margin, short selling, options, and leverage are outside version 1.
_Avoid_: Global market, Thailand stock market

**Portfolio Market Value**:
The current estimated value of all Investment Holdings in an Investment Portfolio using their latest available market prices. It is distinct from the Wallet Balance.
_Avoid_: Wallet Balance, invested cash, purchase total

**Market Quote**:
The latest available market price and its source timestamp for an Investment Holding. Version 1 may use delayed data and must show when the quote was last updated.
_Avoid_: Guaranteed real-time price, purchase price, Investment Exchange Rate

**Market Data Provider**:
An external service used to supply Investment Instruments, Market Quotes, historical prices, and supported corporate-action data. Version 1 uses one primary provider behind a Backend interface so the provider can be replaced later, beginning with a monitored free-tier quota and allowing a future paid plan.
_Avoid_: Investment Portfolio, broker, permanent data source

**Stale Market Data**:
The state where a Market Quote or Market Exchange Rate cannot be refreshed. Walpaca keeps showing the last known value with its timestamp and a warning rather than replacing the Portfolio Market Value with zero.
_Avoid_: Zero value, missing Holding, real-time data

**Market Data Refresh**:
The Backend policy that reuses cached Market Quotes until they are 15 minutes old when a portfolio is viewed, and records a Portfolio Value Snapshot once after the United States market closes each trading day.
_Avoid_: Browser polling, real-time stream, unlimited provider requests

**Portfolio Value Snapshot**:
An end-of-day record of an Investment Portfolio's market value, using the available Market Quotes and Market Exchange Rate for a United States market trading date. Snapshots provide the historical portfolio value chart.
_Avoid_: Live quote, Wallet Balance, Investment Lot

**United States Market Day**:
The trading date in the United States market calendar used for Market Quotes and Portfolio Value Snapshots. The Thai user interface describes it as the United States market close and separately shows the Thai local update time.
_Avoid_: Thailand calendar day, browser date, America/New_York in user-facing text

**Investment Return**:
The performance of an Investment Portfolio after Investment Fees. It is shown as unrealized gain or loss for open Holdings, realized gain or loss for shares sold using FIFO, and total return including dividends.
_Avoid_: Portfolio Market Value, Wallet Balance, purchase total

**Investment Tax Data**:
The transaction, lot, fee, and exchange-rate records retained for a user's future reconciliation or export. Version 1 does not calculate or file tax obligations.
_Avoid_: Tax advice, tax filing, guaranteed taxable gain

**Dashboard Investment Summary**:
A compact Dashboard view of total Investment Portfolio market value, total Investment Return, and Market Quote freshness. Detailed charts, Holdings, lots, and Investment Transactions remain in the related Investment Portfolio.
_Avoid_: Full portfolio detail, Wallet Balance, Spending Budget

**Sub-portfolio**:
An Investment Portfolio nested under another Investment Portfolio to separate investment strategies or goals.
_Avoid_: Sub-wallet when the parent is not investment-oriented

**Wallet Balance**:
The current amount of money held by a Wallet after recorded Transactions and Transfers.
_Avoid_: Transaction amount, total spending

**Transaction Wallet**:
An active Wallet that can directly hold a Transaction. A Parent Wallet with active Sub-wallets summarizes their balances and cannot directly hold new or edited Transactions.
_Avoid_: Parent Wallet transaction, summary transaction

### Money Events

**Transaction**:
A dated record of money entering or leaving a Wallet for a real-life event.
_Avoid_: Transfer, movement, entry

**Investment Transaction**:
A dated record of buying, selling, or receiving dividends for an Investment Holding in an Investment Portfolio. It is distinct from the related movement of money between Wallets.
_Avoid_: Normal Transaction, Transfer, Holding

**Investment Transaction Recalculation**:
The recomputation of lots, FIFO realized gains, Investment Cash, Portfolio Value Snapshots, and derived returns after a user corrects or deletes an Investment Transaction.
_Avoid_: Editing only the visible row, fixed historical result, manual database adjustment

**Manual Investment Entry**:
An Investment Transaction entered by the user with its broker-confirmed details. Version 1 uses Manual Investment Entries; importing broker files is a future capability.
_Avoid_: Broker import, estimated transaction, Market Quote

**Investment Cash**:
Cash held inside an Investment Portfolio. Dividends and stock-sale proceeds enter as Investment Cash and may remain available for a later purchase or be transferred to a Normal Wallet.
_Avoid_: Portfolio Market Value, invested amount, Wallet Balance

**Investment Exchange Rate**:
The Thai baht amount per United States dollar recorded with an Investment Transaction to preserve the actual Thai baht cash movement and show equivalent portfolio values.
_Avoid_: Stock price, current exchange rate, Wallet Balance

**Investment Fee**:
A broker commission, exchange fee, or other charge recorded with an Investment Transaction. A purchase fee increases the Investment Lot cost; a sale fee reduces sale proceeds.
_Avoid_: Stock price, Market Exchange Rate, dividend

**Investment Stock Split**:
A user-recorded corporate action that changes the quantity and per-share cost of existing Investment Lots by a stated ratio without changing their total cost.
_Avoid_: Buy, Sell, Market Quote

**Market Exchange Rate**:
The latest available United States dollar to Thai baht exchange rate used to convert current Portfolio Market Value into Thai baht. It is distinct from the historical Investment Exchange Rate recorded with an Investment Transaction.
_Avoid_: Investment Exchange Rate, purchase exchange rate, fixed portfolio rate

**Transaction Date**:
The calendar date the Transaction belongs to. It may be today or a past date, but not a future date.
_Avoid_: Created date, logged date

**Income**:
A Transaction type that increases the Wallet Balance.
_Avoid_: Deposit, receive

**Expense**:
A Transaction type that decreases the Wallet Balance.
_Avoid_: Payment, spend

**Transaction Category**:
A label for grouping Transactions of the same type so spending and income can be summarized meaningfully.
_Avoid_: Tag, wallet type

**Transaction Template**:
A reusable preset for Transactions that are entered repeatedly with similar details.
_Avoid_: Draft transaction, favorite transaction

**Transaction Note**:
Optional free-form context attached to a Transaction.
_Avoid_: Description, comment

**Amount**:
The money value recorded on a Transaction or Transfer.
_Avoid_: Balance

### Money Movement

**Transfer**:
A movement of money from one Wallet to another Wallet without changing the user's total money.
_Avoid_: Income, expense, transaction

**Source Wallet**:
The Wallet money leaves during a Transfer.
_Avoid_: From account, payer

**Destination Wallet**:
The Wallet money enters during a Transfer.
_Avoid_: To account, receiver

**Transfer Fee**:
An additional cost associated with a Transfer.
_Avoid_: Expense category, service charge transaction

**Money Allocation**:
A grouped movement of an existing Amount from one Source Wallet to one or more Destination Wallets. Its related Transfers are managed together as one financial action.
_Avoid_: Income, recurring transfer, individual transfer

### Reporting And Analysis

**Dashboard**:
A summary view of money, spending, and wallet activity over selected time periods.
_Avoid_: Home page, report page

**Reporting Period**:
The time window used to summarize financial data, such as daily, weekly, monthly, or yearly.
_Avoid_: Date filter, range

**Wallet Summary**:
A summary scoped to one Wallet or a Parent Wallet with its Sub-wallets.
_Avoid_: Global summary, account report

**Dashboard Wallet Summary**:
A user-selected Dashboard section that shows the current balances of up to four eligible Wallets.
_Avoid_: Wallet Summary, global balance

**Daily Transaction View**:
A Wallet-scoped view of Transactions for one calendar day. Its summary includes every money movement recorded in that Wallet on the selected day, while filters only change the visible list. Transfers and Money Allocation Transactions remain visible but are managed from their own workflows.
_Avoid_: Transaction history, date-range filter, wallet statement

**Spending Analysis**:
The comparison of Expenses by Transaction Category to understand where money is used most and least.
_Avoid_: Chart, graph

**Spending Budget**:
A named spending limit for one Reporting Period that tracks Expenses across one or more Transaction Categories within its Wallet Scope. The Wallet Scope is either all eligible Transaction Wallets or an explicitly selected set of Transaction Wallets.
_Avoid_: Savings goal, wallet balance, transfer limit

**Spending Budget Report**:
A view of a Spending Budget for a selected daily, weekly, monthly, or yearly Reporting Period. It may show past or future periods, and always compares recorded Expenses with the Budget's current amount.
_Avoid_: Budget history, forecasted expense

**Spending Plan**:
An explicit, user-created plan covering one to 31 past, current, or future calendar days and one or more Plan Purposes. Each purpose has a target amount per occurrence; the Plan Total is calculated from that target and its selected dates. It tracks Expenses without reserving money or changing Wallet Balances.
_Avoid_: Spending Budget, transfer, reserved balance

**Plan Purpose**:
A named part of a Spending Plan that maps one or more expense Transaction Categories, has a target amount per occurrence, and uses one Spending Plan Distribution rule.
_Avoid_: Transaction Category, wallet purpose

**Plan Total**:
The calculated total of every Plan Purpose's target amount multiplied by the number of dates selected by its Distribution rule.
_Avoid_: entered plan amount, reserved amount

**Spending Plan Distribution**:
The rule that chooses which calendar days receive a Plan Purpose's target amount, such as every day, weekdays, selected weekdays every week, selected weekdays every two weeks, or specific dates. The full target amount applies to each selected date; the plan does not divide the target across dates.
_Avoid_: manual daily allocation, recurring Transaction

**Plan Revision**:
A configuration of a Spending Plan's Wallet Scope, Plan Purposes, category mappings, Distribution rules, and generated occurrence allocations that becomes effective on a specific calendar date and remains in effect until the next Revision. Saving a Revision for the same effective date replaces that day's configuration.
_Avoid_: Transaction edit, plan history entry

**Unplanned Plan Expense**:
An Expense that matches a Plan Purpose's categories and Wallet Scope but occurs on a date where that purpose has no scheduled target. It is shown as spending outside the plan's selected occurrences.
_Avoid_: invalid Transaction, extra budget

**Dashboard Layout**:
The user's chosen arrangement of Dashboard content.
_Avoid_: Theme, page design
