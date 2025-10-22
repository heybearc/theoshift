# 🚀 JW Attendant Scheduler - Production Deployment Guide

## **Target Environment**
- **Production URL**: `https://attendant.cloudigan.net`
- **Server**: `jwa` (10.92.3.22)
- **Database**: PostgreSQL on `10.92.3.21:5432`
- **Deployment Method**: APEX CI/CD with Nuclear Database Option

---

## **📋 Pre-Deployment Checklist**

### **✅ Prerequisites**
- [ ] SSH access to production server (`jwa`)
- [ ] Database credentials for production PostgreSQL
- [ ] Staging environment is healthy and tested
- [ ] All new features tested in staging
- [ ] Backup strategy confirmed

### **✅ New Features to Deploy**
- [ ] **Complete Feedback System** (submission, tracking, admin management)
- [ ] **File Upload Support** (screenshots, documents, logs up to 10MB)
- [ ] **Comprehensive Help Documentation** (role-based content)
- [ ] **User Comment System** (two-way communication)
- [ ] **Admin Feedback Dashboard** (manage all feedback)
- [ ] **Professional Help Center** (troubleshooting, guides)

---

## **🔧 Deployment Steps**

### **Step 1: Execute Production Deployment**

Run the comprehensive deployment script:

```bash
chmod +x deploy-production-complete.sh
./deploy-production-complete.sh
```

This script will:
1. ✅ **Validate staging environment** health
2. ✅ **Create comprehensive backup** (code + database)
3. ✅ **Stop production services** safely
4. ✅ **Deploy latest code** from repository
5. ✅ **Update all staging→production references**
6. ✅ **Install dependencies and build** application
7. ✅ **Migrate database** (nuclear option - fresh schema)
8. ✅ **Create upload directories** for file system
9. ✅ **Start production services** with PM2
10. ✅ **Perform health checks** on all components

### **Step 2: Manual Verification**

After deployment, manually verify:

```bash
# Check application is running
curl https://attendant.cloudigan.net

# Check admin panel
curl https://attendant.cloudigan.net/admin

# Check help system
curl https://attendant.cloudigan.net/help

# Check feedback system
curl https://attendant.cloudigan.net/help/feedback
```

---

## **🔐 Default Credentials**

### **Admin Access**
- **URL**: `https://attendant.cloudigan.net/admin`
- **Email**: `admin@attendant.cloudigan.net`
- **Password**: `admin123`

⚠️ **Change default password immediately after first login!**

---

## **🗄️ Database Configuration**

### **Nuclear Database Option (Recommended)**
The deployment uses a "nuclear" approach:
- ✅ **Fresh schema** with all new tables
- ✅ **Complete Prisma migration** 
- ✅ **Feedback system tables** (feedback, attachments, comments)
- ✅ **Clean admin user** creation
- ✅ **No legacy data conflicts**

### **Database Connection**
```
Host: 10.92.3.21
Port: 5432
Database: jw_attendant_scheduler
User: jw_user
Password: jw_password
```

---

## **📁 File System Configuration**

### **Upload Directories**
```
/opt/jw-attendant-scheduler/public/uploads/
├── feedback/          # Feedback attachments
└── [future uploads]   # Other file types
```

### **Permissions**
- **Directory**: `755` (read/write/execute for owner)
- **Files**: `644` (read/write for owner, read for others)
- **Owner**: Application user

---

## **🎯 Feature Verification Checklist**

### **✅ Core Application**
- [ ] Main page loads (`https://attendant.cloudigan.net`)
- [ ] Admin login works (`/admin`)
- [ ] User authentication functional
- [ ] Event management accessible
- [ ] Navigation and routing working

### **✅ Feedback System**
- [ ] Feedback submission form (`/help/feedback`)
- [ ] File upload functionality (10MB limit)
- [ ] "My Feedback" page (`/help/my-feedback`)
- [ ] Admin feedback management (`/admin/feedback`)
- [ ] User comment system working
- [ ] Status tracking functional

### **✅ Help Documentation**
- [ ] Help Center accessible (`/help`)
- [ ] Getting Started guide (`/help/getting-started`)
- [ ] Event Management guide (`/help/event-management`)
- [ ] Managing Assignments guide (`/help/managing-assignments`)
- [ ] Count Times guide (`/help/count-times`)
- [ ] Troubleshooting guide (`/help/troubleshooting`)
- [ ] Role-based content display

### **✅ File Upload System**
- [ ] Feedback file attachments work
- [ ] Comment file attachments work
- [ ] File validation (size, type) functional
- [ ] File storage in correct directories
- [ ] File download from admin panel

---

## **🔍 Post-Deployment Testing**

### **Test Scenario 1: Complete Feedback Workflow**
1. **Submit feedback** with file attachment
2. **Admin views** feedback in management dashboard
3. **Admin adds comment** and changes status
4. **User sees response** in "My Feedback"
5. **User replies** with additional files
6. **Complete conversation** tracked

### **Test Scenario 2: Help System**
1. **Access Help Center** as different user roles
2. **Verify role-based content** display
3. **Test all help topic pages**
4. **Check cross-links** between topics
5. **Verify troubleshooting** information

### **Test Scenario 3: File Upload Validation**
1. **Upload valid files** (images, PDFs, documents)
2. **Test file size limits** (>10MB should fail)
3. **Test invalid file types** (should be rejected)
4. **Verify file storage** and retrieval
5. **Test file removal** functionality

---

## **📊 Monitoring & Maintenance**

### **Log Monitoring**
```bash
# Application logs
ssh -F ssh_config_jw_attendant jwa 'tail -f /opt/jw-attendant-scheduler/production.log'

# PM2 logs (if using PM2)
ssh -F ssh_config_jw_attendant jwa 'pm2 logs jw-attendant'

# System logs
ssh -F ssh_config_jw_attendant jwa 'journalctl -u nginx -f'
```

### **Health Checks**
```bash
# Application health
curl -f https://attendant.cloudigan.net/api/health

# Database connectivity
ssh -F ssh_config_jw_attendant jwa 'cd /opt/jw-attendant-scheduler && npx prisma db pull'

# File system permissions
ssh -F ssh_config_jw_attendant jwa 'ls -la /opt/jw-attendant-scheduler/public/uploads/'
```

---

## **🚨 Rollback Procedure**

If deployment fails or issues arise:

### **Automatic Rollback**
The deployment script includes automatic rollback on health check failure.

### **Manual Rollback**
```bash
# Connect to production server
ssh -F ssh_config_jw_attendant jwa

# Stop current services
pkill -f 'npm|node|next' || true

# Restore from backup
BACKUP_DIR="/opt/backups/jw-attendant-[timestamp]"
cd /opt/jw-attendant-scheduler
cp $BACKUP_DIR/* . -r

# Restore database
psql -h 10.92.3.21 -U jw_user -d jw_attendant_scheduler < $BACKUP_DIR/database_backup.sql

# Restart services
npm start
```

---

## **🔧 Troubleshooting**

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
tail -f /opt/jw-attendant-scheduler/production.log

# Check dependencies
cd /opt/jw-attendant-scheduler && npm install

# Check environment
cat .env
```

#### **Database Connection Issues**
```bash
# Test database connection
psql -h 10.92.3.21 -U jw_user -d jw_attendant_scheduler -c "SELECT 1;"

# Check Prisma connection
cd /opt/jw-attendant-scheduler && npx prisma db pull
```

#### **File Upload Issues**
```bash
# Check upload directory permissions
ls -la /opt/jw-attendant-scheduler/public/uploads/

# Fix permissions if needed
chmod 755 /opt/jw-attendant-scheduler/public/uploads/
chmod 755 /opt/jw-attendant-scheduler/public/uploads/feedback/
```

---

## **📞 Support Contacts**

### **Technical Issues**
- Use the feedback system at `https://attendant.cloudigan.net/help/feedback`
- Include screenshots and detailed error descriptions
- Attach log files when possible

### **Emergency Contacts**
- **System Administrator**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Network Operations**: [Contact Information]

---

## **✅ Deployment Completion**

Once all checks pass:

1. ✅ **Update documentation** with any changes
2. ✅ **Notify stakeholders** of successful deployment
3. ✅ **Schedule follow-up** monitoring
4. ✅ **Plan user training** on new features
5. ✅ **Document lessons learned** for future deployments

---

**🎉 Production deployment complete! The JW Attendant Scheduler is now live at https://attendant.cloudigan.net with all new features including the comprehensive feedback system, help documentation, and file upload capabilities.**
