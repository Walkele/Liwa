import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TradeStateEngine } from '../services/TradeStateEngine';

export default function TradeRulesScreen({ navigation }) {
  const sopRules = TradeStateEngine.getSOPRules();

  const renderRuleSection = (title, icon, rules, color = '#FF6B6B') => (
    <View style={styles.ruleSection}>
      <View style={[styles.ruleSectionHeader, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
        <Text style={styles.ruleSectionTitle}>{title}</Text>
      </View>
      <View style={styles.ruleSectionContent}>
        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleItem}>
            <View style={[styles.ruleBullet, { backgroundColor: color }]} />
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Rules & SOP</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>SwipeIt Trading Standards</Text>
          <Text style={styles.overviewText}>
            Our Standard Operating Procedures ensure safe, fair, and transparent trading for all users. 
            Please read and understand these rules before participating in trades.
          </Text>
        </View>

        {/* Time Limits */}
        {renderRuleSection(
          'Time Limits & Deadlines',
          'time',
          [
            `Items are locked for maximum ${sopRules.lockDuration}`,
            `Exchange must be completed within ${sopRules.exchangeWindow} of locking`,
            'Failure to meet deadlines results in automatic trade cancellation',
            'Extensions are not available - plan your exchange carefully'
          ],
          '#FF9500'
        )}

        {/* Trading Rules */}
        {renderRuleSection(
          'Trading Rules',
          'swap-horizontal',
          sopRules.rules,
          '#2196F3'
        )}

        {/* Verification Process */}
        {renderRuleSection(
          'Verification & Exchange',
          'shield-checkmark',
          [
            'Both parties receive unique verification codes when trade is locked',
            'Meet in a safe, public location for the exchange',
            'Inspect items carefully before proceeding',
            'Exchange verification codes only during the physical handoff',
            'Both parties must verify in the app to complete the trade',
            'Trade is not complete until both parties confirm in the app'
          ],
          '#4CAF50'
        )}

        {/* Penalties & Strikes */}
        {renderRuleSection(
          'Penalties & Enforcement',
          'warning',
          [
            `Failing to complete a locked trade results in 1 strike`,
            `${sopRules.maxStrikes} strikes result in a ${sopRules.penaltyDays}-day trading ban`,
            'No-shows or last-minute cancellations count as strikes',
            'False reporting or abuse results in immediate penalties',
            'Strikes reset after 30 days of good trading behavior',
            'Banned users cannot participate in any trading activities'
          ],
          '#F44336'
        )}

        {/* Safety Guidelines */}
        {renderRuleSection(
          'Safety Guidelines',
          'shield',
          [
            'Always meet in well-lit, public locations',
            'Bring a friend or inform someone of your meeting',
            'Trust your instincts - cancel if something feels wrong',
            'Verify item condition matches the description',
            'Report suspicious behavior immediately',
            'Use the in-app messaging for all communication'
          ],
          '#9C27B0'
        )}

        {/* User Restrictions */}
        <View style={styles.restrictionsCard}>
          <Text style={styles.restrictionsTitle}>Trading Restrictions</Text>
          <View style={styles.restrictionsList}>
            <View style={styles.restrictionItem}>
              <Ionicons name="lock-closed" size={16} color="#FF6B6B" />
              <Text style={styles.restrictionText}>
                You cannot start new trades with the same user while an active trade is in progress
              </Text>
            </View>
            <View style={styles.restrictionItem}>
              <Ionicons name="time" size={16} color="#FF6B6B" />
              <Text style={styles.restrictionText}>
                Items involved in active trades cannot be edited or deleted
              </Text>
            </View>
            <View style={styles.restrictionItem}>
              <Ionicons name="ban" size={16} color="#FF6B6B" />
              <Text style={styles.restrictionText}>
                Users with active penalties cannot initiate new trades
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            If you encounter issues during a trade or need to report a problem, 
            contact our support team immediately.
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Ionicons name="help-circle" size={20} color="white" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Agreement */}
        <View style={styles.agreementCard}>
          <Text style={styles.agreementText}>
            By participating in trades on SwipeIt, you agree to follow these rules and procedures. 
            Violations may result in account restrictions or permanent bans.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overviewCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  overviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  ruleSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  ruleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  ruleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 12,
  },
  ruleSectionContent: {
    padding: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 12,
  },
  ruleText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  restrictionsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restrictionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  restrictionsList: {
    gap: 12,
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  restrictionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  supportCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  agreementCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  agreementText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});