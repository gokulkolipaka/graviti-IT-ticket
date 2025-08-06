# Support Ticketing System

A comprehensive three-tier support ticketing system with real-time synchronization.

## Features

- **Three-tier user system**: Admin, IT Team Members, Regular Users
- **Real-time synchronization** across all user types
- **Kanban board** with drag-and-drop functionality
- **Email notifications** for ticket assignments
- **Advanced reporting** and analytics
- **Role-based permissions**
- **Company branding** customization

## User Roles

### Admin
- Full access to all features
- Can assign tickets to team members
- Can close resolved tickets
- Access to dashboard and reports
- User management capabilities

### IT Team Members
- Access to Kanban board
- Can resolve assigned tickets (drag from In Progress to Resolved)
- Receive email notifications when assigned tickets
- Can view all tickets or filter to assigned tickets

### Regular Users
- Can create new tickets
- Can view their own tickets
- Can reopen closed tickets if needed
- Limited to ticket creation and status viewing

## Default Login Credentials

- **Admin**: username: `admin`, password: `admin123`
- **IT Team**: username: `itteam1`, password: `team123`
- **User**: username: `user1`, password: `user123`

## Installation

1. Download all files
2. Maintain the folder structure
3. Deploy to web server
4. Access via browser

## Configuration

### Company Branding
- Update company name in the settings
- Upload your company logo (200x80 pixels recommended)
- Customize colors in CSS if needed

### LDAP Integration
- Update `ldap-auth.php` with your LDAP server details
- Replace placeholder values with actual configuration
- Test connection with your LDAP administrator

### Email Configuration
- Currently uses simulated email notifications
- Integrate with your email service (SMTP, SendGrid, etc.)
- Update notification functions in `js/realtime.js`

## Dummy Data Examples

### Email Addresses
- admin@company.com
- itteam1@company.com  
- user1@company.com
- supervisor@company.com

### LDAP Configuration
- Server: your-ldap-server.com
- Base DN: dc=yourcompany,dc=com
- Domain: yourcompany.com

### Company Information
- Company Name: Your Company Name
- Default Logo: assets/logo.png

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License

## Support

For issues and questions, please create a GitHub issue or contact your system administrator.
