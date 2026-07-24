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
A Wallet used for money allocated to investment assets, including stock-focused portfolios.
_Avoid_: Stock account, brokerage account, portfolio as a separate object

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

**Spending Analysis**:
The comparison of Expenses by Transaction Category to understand where money is used most and least.
_Avoid_: Chart, graph

**Dashboard Layout**:
The user's chosen arrangement of Dashboard content.
_Avoid_: Theme, page design
